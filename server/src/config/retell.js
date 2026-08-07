import Retell from 'retell-sdk';

const retellClient = new Retell({
    apiKey: process.env.RETELL_API_KEY || 'default_retell_api_key'
});

export default retellClient;