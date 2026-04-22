import axios, { AxiosError, AxiosInstance } from "axios";

class AICallsService {

    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.AI_CALLS_SERVICE_URL,
            headers: {
                "Content-Type": "application/json",
                "x-bot-secret": process.env.AI_CALLS_SERVICE_API_KEY || "",
            },
        });
    }

    /** POST /call — triggers an immediate outbound AI call */
    async makeCall(payload: {
        to: string;
        contact_name?: string | null;
        custom_instructions?: string | null;
    }) {
        try {
            const response = await this.client.post("/call", { to: payload.to });
            return response.data; // { ok, sid, to, from }
        } catch (error) {
            console.error("Error making call:", (error as AxiosError)?.response?.data || error);
            throw error;
        }
    }

    /** POST /schedule-call — schedules a future call */
    async scheduleCall(payload: {
        phone: string;
        scheduled_for: string;
        contact_name?: string | null;
        custom_instructions?: string | null;
    }) {
        try {
            const response = await this.client.post("/schedule-call", {
                phone: payload.phone,
                scheduled_for: payload.scheduled_for,
            });
            return response.data; // { ok, id, scheduled_for }
        } catch (error) {
            console.error("Error scheduling call:", (error as AxiosError)?.response?.data || error);
            throw error;
        }
    }
    
    async makeCall(payload: Record<string, unknown>) {
        try {
            const response = await this.aiCallsService.post("/api/v1/call", payload);
            return response.data;
        } catch (error) {
            console.error("Error scheduling call:", (error as AxiosError)?.response?.data || error);
            throw error;
        }
    }

    /** POST /scheduled-calls/:id/cancel — cancels a pending scheduled call */
    async cancelScheduledCall(id: string | number) {
        try {
            const response = await this.client.post(`/scheduled-calls/${id}/cancel`);
            return response.data;
        } catch (error) {
            console.error("Error cancelling scheduled call:", (error as AxiosError)?.response?.data || error);
            throw error;
        }
    }

    /** POST /prompt-settings — syncs system message + greeting to the voice bot */
    async syncPrompts(systemMessage: string, greetingPrompt: string) {
        try {
            const response = await this.client.post("/prompt-settings", {
                system_message: systemMessage,
                greeting_prompt: greetingPrompt,
            });
            return response.data;
        } catch (error) {
            console.error("Error syncing prompts:", (error as AxiosError)?.response?.data || error);
            throw error;
        }
    }

    /** GET /api/scheduled-calls — lists all scheduled calls from the voice bot */
    async getScheduledCalls() {
        try {
            const response = await this.client.get("/api/scheduled-calls");
            return response.data;
        } catch (error) {
            console.error("Error fetching scheduled calls:", (error as AxiosError)?.response?.data || error);
            throw error;
        }
    }
}

export default AICallsService;
