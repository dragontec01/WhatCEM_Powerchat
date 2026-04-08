import axios, { AxiosError, AxiosInstance } from "axios";

class AICallsService {

    private aiCallsService: AxiosInstance;

    constructor() {
        this.aiCallsService = axios.create({
            baseURL: process.env.AI_CALLS_SERVICE_URL,
            headers: {
                "Content-Type": "application/json",
                "x-bot-secret": process.env.AI_CALLS_SERVICE_API_KEY || "",
            },
        });
    }

    async createConfiguration(config: any) {
        try {
            const response = await this.aiCallsService.post("/api/v1/configurations", config);
            return response.data;
        } catch (error) {
            console.error("Error creating configuration:", (error as AxiosError)?.response?.data || error);
            throw error;
        }
    }

    async scheduleCall(payload: Record<string, unknown>) {
        try {
            const response = await this.aiCallsService.post("/api/v1/schedule", payload);
            return response.data;
        } catch (error) {
            console.error("Error scheduling call:", (error as AxiosError)?.response?.data || error);
            throw error;
        }
    }
}

export default AICallsService;