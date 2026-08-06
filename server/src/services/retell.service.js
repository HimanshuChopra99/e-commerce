import retellClient from "../config/retell.js";

export async function createCall(userId, userName) {
    const response = await retellClient.call.createWebCall({
        agent_id: process.env.RETELL_AGENT_ID,

        metadata: {
            userId
        },

        retell_llm_dynamic_variables: {
            customer_name: userName
        }
    })

    return response
}
