type envData = {
    username?: string;
    password?: string;
    host?: string;
    port?: string;
    name?: string;
    ssl?: {
        require: boolean;
        rejectUnauthorized: boolean;
        ca: any;
    };
};
declare const _default: envData;
export default _default;
