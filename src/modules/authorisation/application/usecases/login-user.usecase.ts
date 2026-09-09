import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Session, SessionModelType } from '../../domain/session.entity';
import { InjectModel } from '@nestjs/mongoose';
import { SessionsCommandRepository } from '../../infrastructure/session/sessions.command-repository';
import { JwtTokenProvider } from '../jwt-token-provider/jwt-token-provider.service';
import { Response, Request } from 'express';
import { UUIDGeneratorUtil } from '../../../../core/uuid-generation/uuid.service';
import { SQLUserSession } from '../../domain/sql-session.entity';

export type TokensPair = {
    accessToken: string;
    refreshToken: string;
    issuedAt: Date,
    expiresAt: Date
};

// логиним юзера: а именно - создаем пару токенов и создаем сессию для этого юзера, возвращаем токены
export class LoginUser extends Command<TokensPair> {
    constructor(
        public readonly userId: string,
        public readonly req: Request,
    ) {
        super();
    }
}

@CommandHandler(LoginUser)
export class LoginUserHandler implements ICommandHandler<LoginUser> {
    constructor(
        // private usersExternalQueryRepository: UsersExternalQueryRepository,
        // private postsQueryRepository: PostsQueryRepository,
        @InjectModel(Session.name) private SessionModel: SessionModelType,
        private sessionsCommandRepository: SessionsCommandRepository,
        private jwtTokenProvider: JwtTokenProvider,
    ) {}

    async execute({ userId, req }: LoginUser): Promise<TokensPair> {
        // создаем мета данные для сессии
        const deviceName = req.get('User-Agent') || 'unknown device'; // или req.headers['user-agent'] - обязательно с малыми, т.к. по стандарту http все приводится к строчным. Методы .get и .header же осуществляют приведение к строчным(маленьким) под капотом
        // const deviceIp = req.ip || 'unknown ip';
        const deviceIp = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown ip';
        const deviceId = UUIDGeneratorUtil.generateUUID();

        // создаем пару токенов
        const tokensPair = await this.jwtTokenProvider.generatePairOfTokens({
            userId: userId,
            deviceId: deviceId,
        });

        // создаем сессию
        const session = SQLUserSession.createInstance({
            userId: userId,
            deviceName: deviceName,
            deviceIp: deviceIp,
            issuedAt: tokensPair.issuedAt,
            expiresAt: tokensPair.expiresAt,
            deviceId: deviceId,
        });

        // сохраняем
        await this.sessionsCommandRepository.SQLsave(session);


        return {
            accessToken: tokensPair.accessToken,
            refreshToken: tokensPair.refreshToken,
            issuedAt: tokensPair.issuedAt,
            expiresAt: tokensPair.expiresAt,
        };
    }
}
