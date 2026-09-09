import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';

import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtRefreshAuthGuard } from '../../authorisation/guards/refresh-token/refresh-token.auth-guard';
import { CurrentUserMetaData } from '../../authorisation/decorators/extract-meta-data-from-req.decorator';
import { UserRefreshTokenContextAndMetaDataDto } from '../../authorisation/decorators/dto/user-refresh-token-context-and-meta-data.dto';
import { MeViewDto } from '../../authorisation/api/view-dto/me.view-dto';
import { DeviceViewDto } from './view-dto/device.view-dto';
import { GetActiveSessionsList } from '../application/usecases/get-active-sessions-list.usecase';
import { DeleteAllSessionsButCurrentOne } from '../application/usecases/delete-all-sessions-but-current-one.usecase';
import { DeleteSessionByDeviceId } from '../application/usecases/delete-session-by-device-id.usecase';

@Controller('security')
export class SecurityController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {
        console.log('SecurityController created');
    }

    // Returns all devices with active sessions for current user
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtRefreshAuthGuard)
    @Get('devices')
    async getActiveSessionsList(
        @CurrentUserMetaData() user: UserRefreshTokenContextAndMetaDataDto,
    ): Promise<DeviceViewDto[]> {
        return this.queryBus.execute<GetActiveSessionsList>(
            new GetActiveSessionsList(user.userId),
        );
    }

    // Terminate all other (exclude current) device's sessions
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtRefreshAuthGuard)
    @Delete('devices')
    async deleteAllSessionsButCurrentOne(
        @CurrentUserMetaData() user: UserRefreshTokenContextAndMetaDataDto,
    ): Promise<void> {
        return this.commandBus.execute<DeleteAllSessionsButCurrentOne>(
            new DeleteAllSessionsButCurrentOne(user.userId, user.sessionId),
        );
    }

    // Terminate specified device session
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtRefreshAuthGuard)
    @Delete('devices/:deviceId')
    async deleteSessionByDeviceId(
        @Param('deviceId') deviceId: string,
        @CurrentUserMetaData() user: UserRefreshTokenContextAndMetaDataDto,
    ): Promise<void> {
        return this.commandBus.execute<DeleteSessionByDeviceId>(
            new DeleteSessionByDeviceId(user.userId, deviceId),
        );
    }
}
