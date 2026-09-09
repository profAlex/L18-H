import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserAccessTokenContextDto } from '../guards/dto/user-access-token-context.dto';
import { CryptoService } from '../../../core/bcrypt/bcrypt.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../notifications/email.service';
import { UsersService } from '../../user-accounts/application/users.service';
import { UUIDGeneratorUtil } from '../../../core/uuid-generation/uuid.service';
import { MeViewDto } from '../api/view-dto/me.view-dto';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import { UsersQueryRepository } from '../../user-accounts/infrastructure/query/users.query-repository';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private usersQueryRepository: UsersQueryRepository,
        private cryptoService: CryptoService,
        private jwtService: JwtService,
        private emailService: EmailService,
    ) {
        console.log('AuthService created');
    }

    async validateUserCreds(
        loginOrEmail: string,
        password: string,
    ): Promise<UserAccessTokenContextDto | null> {
        const user = await this.usersQueryRepository.SQLfindUserByLogin(loginOrEmail);

        if (!user) {
            return null;
        }

        const isPasswordValid = await this.cryptoService.checkPassword(
            password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            return null;
        }

        return { userId: user.id };
    }

    async loginUser(userId: string): Promise<{ accessToken: string }> {
        const accessToken = await this.jwtService.signAsync({
            userId: userId,
        } as UserAccessTokenContextDto);

        return { accessToken: accessToken };
    }

    async registerAttempt(
        sentLogin: string,
        sentPassword: string,
        sentEmail: string,
    ): Promise<void> {
        const takenField = await this.usersService.checkIfUserExists(
            sentLogin,
            sentEmail,
        );
        // проверяем отдельно занят ли логин а потом емейл, т.к. логика платформенных тестов требует указания field: login при отсутствии логина,
        // поэтмоу разделяем ошибки, но можно попробовать вернуть всегда тут такую ошибку

        // если реповернул имя поля, значит оно занято
        if (takenField) {
            throw new DomainException({
                code: DomainExceptionCode.UserBadRequest,
                message: `User with this ${takenField} already exists`,
                // Динамически подставляем 'login' или 'email' в key
                extensions: [
                    {
                        message: `${takenField === 'login' ? 'Login' : 'Email'} is already taken`,
                        key: takenField,
                    },
                ],
            });
        }

        const newUserId = await this.usersService.createUser({
            login: sentLogin,
            email: sentEmail,
            password: sentPassword,
        });

        const user = await this.usersService.findOrNotFoundFail(newUserId);

        // const passwordHash = await this.cryptoService.generateHash(sentPassword);
        // if (!passwordHash) {
        //     throw new InternalServerErrorException("Couldn't generate hash");
        // }
        // const confirmationCode = UUIDGeneratorUtil.generateUUID();
        //
        // const newUser = this.UserModel.createInstance({
        //     login: sentLogin,
        //     email: sentEmail,
        //     passwordHash: passwordHash,
        //     confirmationCode: confirmationCode
        // });
        // await this.usersCommandRepository.save(newUser);

        if (!user.emailConfirmationInfo.confirmationCode) {
            throw new InternalServerErrorException(
                'Email confirmation code was not generated!',
            );
        }

        await this.emailService.sendConfirmationEmail(
            sentEmail,
            user.emailConfirmationInfo.confirmationCode,
        );
    }

    async confirmRegistration(sentCode: string): Promise<void> {
        const userToBeConfirmed =
            await this.usersService.findUserByConfirmationCode(sentCode);

        if (!userToBeConfirmed) {
            // throw new BadRequestException("Email confirmation code is wrong, outdated or not found.");
            throw new DomainException({
                code: DomainExceptionCode.ConfirmationCodeExpired,
                message:
                    'Email confirmation code is wrong, outdated or not found.',
                extensions: [
                    {
                        message:
                            'Email confirmation code is wrong, outdated or not found.',
                        key: 'code',
                    },
                ],
            });
        }
        // console.log("<----------------TEST HERE 1", sentCode);
        userToBeConfirmed.confirmEmail();
        // console.log("<----------------TEST HERE 2");

        await this.usersService.saveUser(userToBeConfirmed);
    }

    async passwordRecoveryByEmail(sentEmail: string): Promise<void> {
        const user =
            await this.usersService.findConfirmedUserByEmail(sentEmail);
        if (!user) {
            // Returning "success". Even if current email is not registered (for prevent user's email detection)
            return;
        }

        const recoveryCode = UUIDGeneratorUtil.generateUUID();
        user.generateRecoveryCode(recoveryCode);

        await this.usersService.saveUser(user);

        await this.emailService.sendRecoveryEmail(sentEmail, recoveryCode);
    }

    async applyNewPassword(
        sentNewPassword: string,
        sentRecoveryCode: string,
    ): Promise<void> {
        const user =
            await this.usersService.findUserByRecoveryCode(sentRecoveryCode);
        if (!user) {
            // throw new BadRequestException("Recovery code is wrong or expired.");
            throw new DomainException({
                code: DomainExceptionCode.PasswordRecoveryCodeExpired,
                message: 'Recovery code is wrong or expired',
            });
        }

        const newPasswordHash =
            await this.cryptoService.generateHash(sentNewPassword);
        if (!newPasswordHash) {
            throw new InternalServerErrorException(
                "Password hash wasn't generated!",
            );
        }

        user.updatePasswordHash(newPasswordHash);

        await this.usersService.saveUser(user);
    }

    async resendRegistrationEmail(sentEmail: string): Promise<void> {
        const user = await this.usersService.findNotConfirmedByEmail(sentEmail);
        if (!user) {
            // Returning "success". Even if current email is not registered (for prevent user's email detection)
            throw new DomainException({
                code: DomainExceptionCode.BadRequest,
                message: 'Email already confirmed',
                extensions: [
                    { message: 'Email already confirmed', key: 'email' },
                ],
            });
        }

        const confirmationCode = UUIDGeneratorUtil.generateUUID();
        user.generateConfirmationCode(confirmationCode);

        await this.usersService.saveUser(user);

        await this.emailService.sendConfirmationEmail(
            sentEmail,
            confirmationCode,
        );
    }

    async getMeInfo(sentId: string): Promise<MeViewDto> {
        return this.usersService.getMeByIdOrNotFoundFail(sentId);
    }
}
