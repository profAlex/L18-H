import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { Session, SessionSchema } from '../authorisation/domain/session.entity';
import { JwtRefreshTokenStrategy } from '../authorisation/guards/refresh-token/refresh-token.strategy';
import { SessionsCommandRepository } from '../authorisation/infrastructure/session/sessions.command-repository';
import { SessionsQueryRepository } from '../authorisation/infrastructure/session/query/sessions.query-repository';
import { GetActiveSessionsListHandler } from './application/usecases/get-active-sessions-list.usecase';
import {
    DeleteAllSessionsButCurrentOneHandler
} from './application/usecases/delete-all-sessions-but-current-one.usecase';
import { DeleteSessionByDeviceIdHandler } from './application/usecases/delete-session-by-device-id.usecase';
import { SecurityController } from './api/security.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    ],
    controllers: [SecurityController],
    providers: [
        DeleteSessionByDeviceIdHandler,
        DeleteAllSessionsButCurrentOneHandler,
        GetActiveSessionsListHandler,
        JwtRefreshTokenStrategy,
        SessionsCommandRepository,
        SessionsQueryRepository,
    ],
    exports: [],
})

export class SecurityDevicesModule {
}
