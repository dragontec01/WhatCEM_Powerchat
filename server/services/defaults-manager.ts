import { Assign, scheduleMilestone, User, UserGroup } from "@shared/db/schema";
import { storage } from "server/storage";
import { logger } from "server/utils/logger";

export class DefaultsManager {

    private companyIds: number[];
    private companyUsers: User[];
    private defaultGroup: UserGroup | null = null;
    private defaultAssign: Assign | null = null;

    constructor() {
        // check or create all defaults here
        this.companyIds = [];
        this.companyUsers = [];
    }

    async initialize() {
        // Get all company IDs
        this.companyIds = (await storage.getAllCompanies()).map(company => company.id);
        // For each company, ensure default group and assigns
        for (const companyId of this.companyIds) {
            this.defaultGroup = null;
            this.defaultAssign = null;
            this.companyUsers = (await storage.getUsersByCompany(companyId)) || [];
            await this.createDefaultGroupAssigns(companyId),
            await Promise.all([
                this.addAllUsersToDefaultGroup(),
                this.assignDefaultSchedulesToAllUsers(),
            ]);
            await this.setDefaultAssignsForChannelConnections(companyId)
        }
    }

    async createDefaultGroupAssigns(companyId: number) {
        try {
            const [defaultGroup, defaultAssign] = await Promise.all([
                storage.getDefaultUserGroup(companyId),
                storage.getDefaultAssigns(companyId)
            ]);
            if( defaultGroup && defaultAssign ) {
                this.defaultGroup = defaultGroup;
                this.defaultAssign = defaultAssign;
                return;
            }

            if( !defaultGroup ) {
                this.defaultGroup = await storage.createUserGroup({
                    companyId: companyId,
                    name: 'Default Group',
                    isDefault: true,
                    description: 'This is the default user group created automatically.'
                });
                logger.info('create-default-group-assigns', `Created default user group for company ${companyId}`);
            } else this.defaultGroup = defaultGroup;
            if( !defaultAssign ) {
                this.defaultAssign = await storage.createAssign({
                    companyId: companyId,
                    assignName: 'Default Assign',
                    isDefault: true,
                    relatedGroupId: (this.defaultGroup as UserGroup).id,
                    schedule: Array.from({ length: 7 }, (_, index) => ({
                        scheduleStart: '00:00',
                        scheduleEnd: '23:59',
                        scheduleIndex: index,
                        dayOfWeek: index,
                        color: '#000000',
                        textColor: '#2a2932'
                    })) as scheduleMilestone[],
                });
                logger.info('create-default-group-assigns', `Created default assigns for company ${companyId}`);
            } else this.defaultAssign = defaultAssign;
            return;
        } catch (error) {
            logger.error('create-default-group-assigns', 'Error creating default group assigns:', error);
            throw error;
        }
    }

    async addAllUsersToDefaultGroup() {
        // Implementation to add all users to the default group
        try {
            const groupMembers = await storage.getGroupMembersByGroupId(this.defaultGroup?.id as number);
            const membersMapped = new Map<number, boolean>();
            groupMembers.forEach(member => membersMapped.set(member.userId, true));
            await Promise.all(this.companyUsers.filter(user => !membersMapped.has(user.id)).map(user => storage.createUserGroupMember({
                userId: user.id,
                role: user.role === 'admin' ? 'admin' : 'member',
                groupId: (this.defaultGroup as UserGroup).id
            })));
        } catch (error) {
            logger.error('add-all-users-to-default-group', 'Error adding users to default group:', error);
            throw error;
        }
    }

    async assignDefaultSchedulesToAllUsers() {
        // Implementation to assign default schedules to all users
        try {
            const assignedUsers = await storage.getAssignedUsersByAssignId((this.defaultAssign as Assign).id);
            const assignedMapped = new Map<number, boolean>();
            assignedUsers.forEach(assigned => assignedMapped.set(assigned.userId, true));
            await Promise.all(this.companyUsers.filter(user => !assignedMapped.has(user.id)).map(user => storage.createAssignUser({
                userId: user.id,
                assignId: (this.defaultAssign as Assign).id,
                indexSchedules: ((this.defaultAssign as Assign).schedule as scheduleMilestone[]).map((milestone: scheduleMilestone) => ({
                    index: milestone.scheduleIndex,
                    assigned: true
                }))
            })));
        } catch (error) {
            logger.error('assign-default-schedules-to-all-users', 'Error assigning default schedules to all users:', error);
            throw error;
        }
    }

    async setDefaultAssignsForChannelConnections(companyId: number) {
        try {
            const channelConnections = await storage.getChannelConnectionsByCompany(companyId);
            await Promise.all(channelConnections.map(connection => {
                if (!connection.assignId) {
                    return storage.updateChannelConnectionAssignId(connection.id, this.defaultAssign?.id as number);
                }
            }));
            logger.info('set-default-assigns-for-channel-connections', `Set default assigns for channel connections of company ${companyId}`);
        } catch (error) {
            logger.error('set-default-assigns-for-channel-connections', 'Error setting default assigns for channel connections:', error);
            throw error;
        }
    }
}