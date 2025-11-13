import { Assign, scheduleMilestone, User, UserGroup } from "@shared/db/schema";
import { storage } from "server/storage";
import { logger } from "server/utils/logger";

export class DefaultsManager {

    private companyId: number;
    private companyUsers: User[];
    private defaultGroup: UserGroup | null = null;
    private defaultAssign: Assign | null = null;

    constructor(companyId: number) {
        // check or create all defaults here
        this.companyId = companyId;
        this.companyUsers = [];
    }

    async initialize() {
        this.companyUsers = (await storage.getUsersByCompany(this.companyId));
        await Promise.all([
            this.createDefaultGroupAssigns(),
            this.addAllUsersToDefaultGroup(),
            this.assignDefaultSchedulesToAllUsers()
        ]);
    }

    async createDefaultGroupAssigns() {
        try {
            const [defaultGroup, defaultAssign] = await Promise.all([
                storage.getDefaultUserGroup(this.companyId),
                storage.getDefaultAssigns(this.companyId)
            ]);
            if( defaultGroup && defaultAssign ) {
                this.defaultGroup = defaultGroup;
                this.defaultAssign = defaultAssign;
                return;
            }

            if( !defaultGroup ) {
                this.defaultGroup = await storage.createUserGroup({
                    companyId: this.companyId,
                    name: 'Default Group',
                    isDefault: true,
                    description: 'This is the default user group created automatically.'
                });
                logger.info('create-default-group-assigns', `Created default user group for company ${this.companyId}`);
            } else this.defaultGroup = defaultGroup;
            if( !defaultAssign ) {
                this.defaultAssign = await storage.createAssign({
                    companyId: this.companyId,
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
                logger.info('create-default-group-assigns', `Created default assigns for company ${this.companyId}`);
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
            await Promise.all(this.companyUsers.map(user => storage.createUserGroupMember({
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
            await Promise.all(this.companyUsers.map(user => storage.createAssignUser({
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
}