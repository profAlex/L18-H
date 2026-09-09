import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local/local.auth-guard';
import { ExtractUserIfExistsFromRequest } from '../decorators/extract-user-if-exists.decorator';
import { UserAccessTokenContextDto } from '../guards/dto/user-access-token-context.dto';
import { AuthService } from '../application/auth.service';
import { RegisterNewUserDto } from './input-dto/register-new-user.input-dto';
import { RegistrationConfirmationInputDto } from './input-dto/registration-confirmation.input-dto';
import { PasswordRecoveryInputDto } from './input-dto/password-recovery.input-dto';
import { NewPasswordInputDto } from './input-dto/new-pasword.input-dto';
import { RegistrationEmailResendingInputDto } from './input-dto/registration-email-resending.input-dto';
import { JwtAuthGuard } from '../guards/bearer/jwt.auth-guard';
import { MeViewDto, SQLMeViewDto } from './view-dto/me.view-dto';
import { UserLoginInputDto } from '../../user-accounts/api/input-dto/login-user.input-dto';
import { Response, Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    LoginUser,
    TokensPair,
} from '../application/usecases/login-user.usecase';
import { JwtRefreshAuthGuard } from '../guards/refresh-token/refresh-token.auth-guard';
import { RefreshToken } from '../application/usecases/refresh-token.usecase';
import { CurrentUserMetaData } from '../decorators/extract-meta-data-from-req.decorator';
import { UserRefreshTokenContextAndMetaDataDto } from '../decorators/dto/user-refresh-token-context-and-meta-data.dto';
import { Logout } from '../application/usecases/logout.usecase';
import { CustomThrottlerGuard } from '../guards/custom-throttler/custom-throttler.guard';
import { TestQuery } from '../application/usecases/test-query.usecase';
import { TestCreateDb } from '../application/usecases/test-create-db.usecase';
import { PasswordRecoveryCommand } from '../application/usecases/password-recovery.usecase';
import { NewPasswordCommand } from '../application/usecases/new-password.usecase';
import { ConfirmRegistrationCommand } from '../application/usecases/registration-confirmation.usecase';
import { RegisterUserCommand } from '../application/usecases/registration.usecase';
import {
    ResendRegistrationEmailCommand,
    ResendRegistrationEmailHandler,
} from '../application/usecases/resend-registration-email.usecase';
import { GetMeInfoQuery } from '../application/usecases/get-me-info.usecase';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {
        console.log('AuthController created');
    }

    // @HttpCode(HttpStatus.OK)
    // @Get('testCreateDb')
    // async testCreateDb() //@Body() body: UserLoginInputDto,
    // : Promise<void> {
    //     const result: string = await this.commandBus.execute<TestCreateDb>(
    //         new TestCreateDb(),
    //     );
    //
    //     //     CREATE TABLE "Profiles" (
    //     //         "UserId" integer PRIMARY KEY,
    //     //         "Hobby" varchar,
    //     //         "Education" varchar
    //     // );
    //
    //     console.log(result);
    //
    //     return;
    // }
    //
    // @HttpCode(HttpStatus.OK)
    // @Get('testQuery')
    // async testQuery() //@Body() body: UserLoginInputDto,
    // : Promise<string> {
    //     const result: string = await this.queryBus.execute<TestQuery>(
    //         new TestQuery(),
    //     );
    //
    //     //     CREATE TABLE "Profiles" (
    //     //         "UserId" integer PRIMARY KEY,
    //     //         "Hobby" varchar,
    //     //         "Education" varchar
    //     // );
    //
    //     // console.log(result);
    //
    //     return result;
    // }

    // Try login user to the system
    @HttpCode(HttpStatus.OK)
    // @UseGuards(LocalAuthGuard)
    // // @UseGuards(CustomThrottlerGuard)
    // @UseGuards(ThrottlerGuard)
    @UseGuards(ThrottlerGuard, LocalAuthGuard)
    @Post('login')
    async login(
        // @Body() body: UserLoginInputDto,
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
        @Res({ passthrough: true }) res: Response,
        @Req() req: Request,
    ): Promise<{
        accessToken: string;
    }> {
        const tokensPair: TokensPair = await this.commandBus.execute<LoginUser>(
            new LoginUser(user.userId, req),
        );

        res.cookie('refreshToken', tokensPair.refreshToken, {
            httpOnly: true,
            secure: true,
            // sameSite: 'none',
            path: '/',
            expires: tokensPair.expiresAt,
        });

        return { accessToken: tokensPair.accessToken };
    }

    // Generate new pair of access and refresh tokens (in cookie client must send
    // correct refreshToken that will be revoked after refreshing)
    // Device LastActiveDate should be overridden by issued Date of new refresh token
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtRefreshAuthGuard)
    @Post('refresh-token')
    async refreshToken(
        //@Body() body: UserLoginInputDto,
        @CurrentUserMetaData() user: UserRefreshTokenContextAndMetaDataDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{
        accessToken: string;
    }> {
        const tokensPair: TokensPair =
            await this.commandBus.execute<RefreshToken>(
                new RefreshToken({
                    userId: user.userId,
                    deviceId: user.deviceId,
                    sessionId: user.sessionId,
                    issuedAt: user.issuedAt,
                    expiresAt: user.expiresAt,
                }),
            );

        res.cookie('refreshToken', tokensPair.refreshToken, {
            httpOnly: true,
            secure: true,
            // sameSite: 'none',
            path: '/',
            expires: tokensPair.expiresAt,
        });

        return { accessToken: tokensPair.accessToken };
    }

    // Password recovery via Email confirmation. Email should be sent with RecoveryCode inside
    @HttpCode(HttpStatus.NO_CONTENT)
    // @UseGuards(CustomThrottlerGuard)
    @UseGuards(ThrottlerGuard)
    @Post('password-recovery')
    async passwordRecovery(
        @Body() body: PasswordRecoveryInputDto,
    ): Promise<void> {
        return this.commandBus.execute(new PasswordRecoveryCommand(body.email));
    }

    // Confirm Password recovery
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(ThrottlerGuard)
    @Post('new-password')
    async newPassword(@Body() body: NewPasswordInputDto): Promise<void> {
        return this.commandBus.execute(
            new NewPasswordCommand(body.newPassword, body.recoveryCode),
        );
    }

    // Confirm registration
    @HttpCode(HttpStatus.NO_CONTENT)
    // @UseGuards(CustomThrottlerGuard)
    @UseGuards(ThrottlerGuard)

    @Post('registration-confirmation')
    async registrationConfirmation(
        @Body() body: RegistrationConfirmationInputDto,
    ): Promise<void> {
        return this.commandBus.execute(
            new ConfirmRegistrationCommand(body.code),
        );
    }

    // Registration in the system. Email with confirmation code will be send to passed email address
    @HttpCode(HttpStatus.NO_CONTENT)
    // @UseGuards(CustomThrottlerGuard)
    @UseGuards(ThrottlerGuard)
    @Post('registration')
    async registration(@Body() body: RegisterNewUserDto) {
        return this.commandBus.execute(
            new RegisterUserCommand(body.login, body.password, body.email),
        );
    }

    // Resend confirmation registration Email if user exists
    @HttpCode(HttpStatus.NO_CONTENT)
    // @UseGuards(CustomThrottlerGuard)
    @UseGuards(ThrottlerGuard)
    @Post('registration-email-resending')
    async registrationEmailResending(
        @Body() body: RegistrationEmailResendingInputDto,
    ) {
        await this.commandBus.execute(
            new ResendRegistrationEmailCommand(body.email),
        );
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtRefreshAuthGuard)
    @Post('logout')
    async logout(
        @CurrentUserMetaData() user: UserRefreshTokenContextAndMetaDataDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
        await this.commandBus.execute<Logout>(new Logout(user.sessionId));

        // очищаем refreshToken в куках браузера
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            // sameSite: 'none',
            path: '/',
        });
    }

    // Get information about current user
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async requestMe(
        @ExtractUserIfExistsFromRequest() user: UserAccessTokenContextDto,
    ): Promise<MeViewDto> {
        return this.queryBus.execute<SQLMeViewDto>(
            new GetMeInfoQuery(user.userId),
        );
    }
}
