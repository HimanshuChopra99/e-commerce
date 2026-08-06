import * as retellService from '../services/retell.service.js'

export const createCall = async (req, res) => {
    try {
        const { userId, userName } = req.body;
console.log(userId, userName)
        if(!userId || !userName) {
            return res.status(400).json({
                success: false,
                message: "UserId or userName is missing"
            })
        }

        //calling retell service
        const session = await retellService.createCall(userId, userName)

        return res.status(200).json({
            success: true,
            session
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "failed to create call",
            error: error.message
        })
    }
}