import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Session, SessionModelType } from '../../domain/session.entity';
import { InjectModel } from '@nestjs/mongoose';
import { SessionsCommandRepository } from '../../infrastructure/session/sessions.command-repository';
import { JwtTokenProvider } from '../jwt-token-provider/jwt-token-provider.service';
import { TokensPair } from './login-user.usecase';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';

// export type TokensPair = {
//     accessToken: string;
//     refreshToken: string;
// };

// логиним юзера: а именно - создаем пару токенов и создаем сессию для этого юзера, возвращаем токены
export class RefreshToken extends Command<TokensPair> {
    constructor(
        public readonly payload: {
            userId: string;
            deviceId: string;
            sessionId: string;
            issuedAt: Date;
            expiresAt: Date;
        },
    ) {
        super();
    }
}

@CommandHandler(RefreshToken)
export class RefreshTokenHandler implements ICommandHandler<RefreshToken> {
    constructor(
        // private usersExternalQueryRepository: UsersExternalQueryRepository,
        // private postsQueryRepository: PostsQueryRepository,
        @InjectModel(Session.name) private SessionModel: SessionModelType,
        private sessionsCommandRepository: SessionsCommandRepository,
        private jwtTokenProvider: JwtTokenProvider,
    ) {}

    async execute(command: RefreshToken): Promise<TokensPair> {
        // извлекаем мета данные для сессии
        const { userId, deviceId, sessionId, issuedAt, expiresAt } =
            command.payload;

        if (
            !userId ||
            !deviceId ||
            !sessionId ||
            !(issuedAt instanceof Date) ||
            isNaN(issuedAt.getTime()) ||
            !(expiresAt instanceof Date) ||
            isNaN(expiresAt.getTime())
        ) {
            throw new DomainException({
                code: DomainExceptionCode.Unauthorized,
                message: 'Improper refresh token structure',
            });
        }

        // находим сессию
        const sessionDocument =
            await this.sessionsCommandRepository.SQLfindSessionBySessionId(
                sessionId,
            );

        if (!sessionDocument) {
            throw new DomainException({
                code: DomainExceptionCode.Unauthorized,
                message: 'Session not found',
            });
        }

        // создаем пару токенов
        const tokensPair = await this.jwtTokenProvider.generatePairOfTokens({
            userId: userId,
            deviceId: deviceId,
        });

        // внутри генератора токенов было рассчиатно и возвращено обновленные время создания и время жизни токена, которые мы запишем в сессию
        sessionDocument.updateSession({
            issuedAt: tokensPair.issuedAt, expiresAt: tokensPair.expiresAt,
        });

        // сохраняем
        await this.sessionsCommandRepository.SQLsave(sessionDocument);

        return {
            accessToken: tokensPair.accessToken,
            refreshToken: tokensPair.refreshToken,
            issuedAt: tokensPair.issuedAt,
            expiresAt: tokensPair.expiresAt,
        };
    }
}
