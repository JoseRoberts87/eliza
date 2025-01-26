import { EmailClientConfig } from "./index";

export const createConfig = (
    host: string,
    port: number,
    user: string,
    pass: string,
    from: string,
    templatesDir?: string
): EmailClientConfig => {
    return {
        smtp: {
            host,
            port,
            secure: port === 465, // true for 465, false for other ports
            auth: {
                user,
                pass,
            },
        },
        from,
        templatesDir,
    };
};

export const validateConfig = (config: EmailClientConfig): void => {
    const { smtp, from } = config;

    if (!smtp) throw new Error("SMTP configuration is required");
    if (!smtp.host) throw new Error("SMTP host is required");
    if (!smtp.port) throw new Error("SMTP port is required");
    if (!smtp.auth) throw new Error("SMTP authentication is required");
    if (!smtp.auth.user) throw new Error("SMTP username is required");
    if (!smtp.auth.pass) throw new Error("SMTP password is required");
    if (!from) throw new Error("From email address is required");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(from)) {
        throw new Error("Invalid from email address format");
    }
};
