// import dotenv from "dotenv";
// dotenv.config();

import 'dotenv/config';
import * as process from 'node:process';

// дефолтные значения параметров
const DEFAULT_PORT = '3003';
const DEFAULT_ACCESS_TOKEN_SECRET = 'ryuas235GCPHvlt347782uzHBSDuw4hr';
const DEFAULT_REFRESH_TOKEN_SECRET = 'ryuas235GCPHvlt347782uzHBSDuw4hr';
const DEFAULT_ACCESS_TOKEN_LIFETIME = '600'; // sec
const DEFAULT_REFRESH_TOKEN_LIFETIME = '1200'; // sec

const DEFAULT_COOKIE_DOMAIN = 'localhost';
const DEFAULT_COOKIE_SECURE = true;

const DEFAULT_MAIL_PORT = '465';
const DEFAULT_MAIL_HOST = 'smtp.yandex.ru';
const DEFAULT_MAIL_LOGIN = 'geniusb198';
const DEFAULT_MAIL_PASS = 'zjtrfatkvzoxowdr';

const DEFAULT_MONGO_URI =
    'mongodb+srv://bolly198:68JauVAaIi2fm9UW@newlearningcluster.1tnov1c.mongodb.net/?appName=NewLearningCluster';

// 'mongodb://localhost:27017/incubator_local_db';

// структура конфигурационных значений
type Config = {
    appPort: number;
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenLifetime: number;
    refreshTokenLifetime: number;
    mailPort: number;
    mailHost: string;
    mailLogin: string;
    mailPass: string;
    mongoURI: string;
};

// парсинг значений
const getConfig = (): Config => {
    let appPort = process.env.PORT;
    let accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    let refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    let accessTokenLifetime = process.env.ACCESS_TOKEN_LIFETIME;
    let refreshTokenLifetime = process.env.REFRESH_TOKEN_LIFETIME;
    let mailPort = process.env.MAIL_PORT;
    let mailHost = process.env.MAIL_HOST;
    let mailLogin = process.env.MAIL_LOGIN;
    let mailPass = process.env.MAIL_PASS;
    // поправить тут?
    let mongoURI = process.env.MONGO_URI_LOCAL;

    // валидация
    if (!appPort) {
        console.warn(
            `PORT is not defined in .env! Applied default port number ${DEFAULT_PORT}.`,
        );
        appPort = DEFAULT_PORT;
    }

    // if (!accessJwtSecret) throw new Error("JWT_SECRET is required in .env");
    if (!accessTokenSecret) {
        console.warn(
            'ACCESS_TOKEN_SECRET is not defined in .env! Applied default value.',
        );
        accessTokenSecret = DEFAULT_ACCESS_TOKEN_SECRET;
    }

    if (!refreshTokenSecret) {
        console.warn(
            'REFRESH_TOKEN_SECRET is not defined in .env! Applied default value.',
        );
        refreshTokenSecret = DEFAULT_REFRESH_TOKEN_SECRET;
    }

    if (!accessTokenLifetime) {
        console.warn(
            `ACCESS_TOKEN_LIFETIME is not defined in .env! Applied default value (seconds): ${DEFAULT_ACCESS_TOKEN_LIFETIME}.`,
        );
        accessTokenLifetime = DEFAULT_ACCESS_TOKEN_LIFETIME;
    }

    if (!refreshTokenLifetime) {
        console.warn(
            `REFRESH_TOKEN_LIFETIME is not defined in .env! Applied default value (seconds): ${DEFAULT_REFRESH_TOKEN_LIFETIME}.`,
        );
        refreshTokenLifetime = DEFAULT_REFRESH_TOKEN_LIFETIME;
    }

    if (!mailPort) {
        console.warn(
            `MAIL_PORT is not defined in .env! Applied default value: ${DEFAULT_MAIL_PORT}.`,
        );
        mailPort = DEFAULT_MAIL_PORT;
    }

    if (!mailHost) {
        console.warn(
            `MAIL_HOST is not defined in .env! Applied default value: ${DEFAULT_MAIL_HOST}.`,
        );
        mailHost = DEFAULT_MAIL_HOST;
    }

    if (!mailLogin) {
        console.warn(
            `MAIL_LOGIN is not defined in .env! Applied default value: ${DEFAULT_MAIL_LOGIN}.`,
        );
        mailLogin = DEFAULT_MAIL_LOGIN;
    }

    if (!mailPass) {
        console.warn(
            `MAIL_PASS is not defined in .env! Applied default value: ${DEFAULT_MAIL_PASS}.`,
        );
        mailPass = DEFAULT_MAIL_PASS;
    }

    if (!mongoURI) {
        console.warn(
            `MONGO_URI is not defined in .env! Applied default value: ${DEFAULT_MONGO_URI}.`,
        );
        mongoURI = DEFAULT_MONGO_URI;
    }

    return {
        appPort: parseInt(appPort, 10),
        accessTokenSecret: accessTokenSecret,
        refreshTokenSecret: refreshTokenSecret,
        accessTokenLifetime: parseInt(accessTokenLifetime, 10),
        refreshTokenLifetime: parseInt(refreshTokenLifetime, 10),
        mailPort: parseInt(mailPort, 10),
        mailHost: mailHost,
        mailLogin: mailLogin,
        mailPass: mailPass,
        mongoURI: mongoURI,
    };
};

export const envConfig = getConfig();
