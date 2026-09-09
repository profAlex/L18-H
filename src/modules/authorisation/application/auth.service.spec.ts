import {AuthService} from "./auth.service";
import {CryptoService} from "../../../core/bcrypt/bcrypt.service";
import {JwtService} from "@nestjs/jwt";
import {EmailService} from "../../notifications/email.service";
import {Test, TestingModule} from "@nestjs/testing";
import {DomainException} from "../../../core/exceptions/domain-exceptions";
import {InternalServerErrorException} from "@nestjs/common";
import {UUIDGeneratorUtil} from "../../../core/uuid-generation/uuid.service";
import {UsersService} from "../../user-accounts/application/users.service";
import {Types} from "mongoose";

// describe ("AuthService", () => {
//     let service: AuthService;
//
//         // private usersService: UsersService,
//         // private cryptoService: CryptoService,
//         // private jwtService: JwtService,
//         // private emailService: EmailService
//
//     const mockUsersService = {
//
//     }
//
// });

describe('AuthService', () => {
    let authService: AuthService;
    let usersService: jest.Mocked<UsersService>;
    let cryptoService: jest.Mocked<CryptoService>;
    let jwtService: jest.Mocked<JwtService>;
    let emailService: jest.Mocked<EmailService>;

    beforeEach(async () => {
        // Создаем моки для всех зависимостей
        const mockUsersService = {
            findUserByLogin: jest.fn(),
            checkIfUserExists: jest.fn(),
            createUser: jest.fn(),
            findOrNotFoundFail: jest.fn(),
            findUserByConfirmationCode: jest.fn(),
            saveUser: jest.fn(),
            findConfirmedUserByEmail: jest.fn(),
            findUserByRecoveryCode: jest.fn(),
            findNotConfirmedByEmail: jest.fn(),
            getMeByIdOrNotFoundFail: jest.fn(),
        };

        const mockCryptoService = {
            checkPassword: jest.fn(),
            generateHash: jest.fn(),
        };

        const mockJwtService = {
            signAsync: jest.fn(),
        };

        const mockEmailService = {
            sendConfirmationEmail: jest.fn(),
            sendRecoveryEmail: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: CryptoService, useValue: mockCryptoService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: EmailService, useValue: mockEmailService },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        usersService = module.get(UsersService);
        cryptoService = module.get(CryptoService);
        jwtService = module.get(JwtService);
        emailService = module.get(EmailService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateUserCreds', () => {
        it('should return null if user is not found', async () => {
            usersService.findUserByLogin.mockResolvedValue(null);

            const result = await authService.validateUserCreds('wrong_user', 'password');

            expect(result).toBeNull();
            expect(usersService.findUserByLogin).toHaveBeenCalledWith('wrong_user');
        });

        it('should return null if password hash is invalid', async () => {
            const mockUser = { id: 'user-123', passwordHash: 'hashed_pass' };
            usersService.findUserByLogin.mockResolvedValue(mockUser as any);
            cryptoService.checkPassword.mockResolvedValue(false);

            const result = await authService.validateUserCreds('login', 'wrong_password');

            expect(result).toBeNull();
            expect(cryptoService.checkPassword).toHaveBeenCalledWith('wrong_password', 'hashed_pass');
        });

        it('should return user context id if credentials are valid', async () => {
            const mockUser = { id: 'user-123', passwordHash: 'correct_hash' };
            usersService.findUserByLogin.mockResolvedValue(mockUser as any);
            cryptoService.checkPassword.mockResolvedValue(true);

            const result = await authService.validateUserCreds('login', 'correct_password');

            expect(result).toEqual({ id: 'user-123' });
        });
    });

    describe('loginUser', () => {
        it('should sign JWT token and return accessToken object', async () => {
            jwtService.signAsync.mockResolvedValue('mocked_jwt_token');

            const result = await authService.loginUser('user-123');

            expect(result).toEqual({ accessToken: 'mocked_jwt_token' });
            expect(jwtService.signAsync).toHaveBeenCalledWith({ id: 'user-123' });
        });
    });

    describe('registerAttempt', () => {
        it('should throw DomainException if login or email is already taken', async () => {
            usersService.checkIfUserExists.mockResolvedValue('login'); // репо вернул, что занят login

            await expect(
                authService.registerAttempt('taken_login', 'pass', 'email@test.com')
            ).rejects.toThrow(DomainException);

            expect(usersService.checkIfUserExists).toHaveBeenCalledWith('taken_login', 'email@test.com');
        });

        it('should throw InternalServerErrorException if confirmation code is missing', async () => {
            usersService.checkIfUserExists.mockResolvedValue(null);
            usersService.createUser.mockResolvedValue('new-user-id');

            const mockUserWithoutCode = {
                emailConfirmationInfo: { confirmationCode: null }
            };
            usersService.findOrNotFoundFail.mockResolvedValue(mockUserWithoutCode as any);

            await expect(
                authService.registerAttempt('login', 'pass', 'email@test.com')
            ).rejects.toThrow(InternalServerErrorException);
        });

        it('should create user and send confirmation email if data is valid', async () => {
            usersService.checkIfUserExists.mockResolvedValue(null);
            usersService.createUser.mockResolvedValue('new-user-id');

            const mockUser = {
                emailConfirmationInfo: { confirmationCode: 'uuid-code-123' }
            };
            usersService.findOrNotFoundFail.mockResolvedValue(mockUser as any);

            await authService.registerAttempt('new_login', 'pass', 'email@test.com');

            expect(usersService.createUser).toHaveBeenCalledWith({
                login: 'new_login',
                email: 'email@test.com',
                password: 'pass'
            });
            expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith('email@test.com', 'uuid-code-123');
        });
    });

    describe('confirmRegistration', () => {
        it('should throw DomainException if code is invalid/expired', async () => {
            usersService.findUserByConfirmationCode.mockResolvedValue(null);

            await expect(
                authService.confirmRegistration('invalid_code')
            ).rejects.toThrow(DomainException);
        });

        it('should confirm email and save user if code is valid', async () => {
            const mockUserInstance = {
                confirmEmail: jest.fn(),
            };
            usersService.findUserByConfirmationCode.mockResolvedValue(mockUserInstance as any);

            await authService.confirmRegistration('valid_code');

            expect(mockUserInstance.confirmEmail).toHaveBeenCalled();
            expect(usersService.saveUser).toHaveBeenCalledWith(mockUserInstance);
        });
    });

    describe('passwordRecoveryByEmail', () => {
        it('should silently return if confirmed user is not found by email', async () => {
            usersService.findConfirmedUserByEmail.mockResolvedValue(null);

            await expect(authService.passwordRecoveryByEmail('notfound@test.com')).resolves.not.toThrow();
            expect(emailService.sendRecoveryEmail).not.toHaveBeenCalled();
        });

        it('should generate recovery code, save user, and send email', async () => {
            const mockUserInstance = {
                generateRecoveryCode: jest.fn(),
            };

            const uuidSpy = jest.spyOn(UUIDGeneratorUtil, 'generateUUID').mockReturnValue('mocked-recovery-uuid');

            usersService.findConfirmedUserByEmail.mockResolvedValue(mockUserInstance as any);


            await authService.passwordRecoveryByEmail('found@test.com');

            expect(mockUserInstance.generateRecoveryCode).toHaveBeenCalledWith('mocked-recovery-uuid');
            expect(usersService.saveUser).toHaveBeenCalledWith(mockUserInstance);
            expect(emailService.sendRecoveryEmail).toHaveBeenCalledWith('found@test.com', 'mocked-recovery-uuid');

            uuidSpy.mockRestore();
        });
    });

    describe('applyNewPassword', () => {
        it('should throw DomainException if recovery code is wrong or expired', async () => {
            usersService.findUserByRecoveryCode.mockResolvedValue(null);

            await expect(
                authService.applyNewPassword('new_pass', 'wrong_code')
            ).rejects.toThrow(DomainException);
        });

        it('should throw InternalServerErrorException if hash generation fails', async () => {
            const mockUserInstance = { updatePasswordHash: jest.fn() };
            usersService.findUserByRecoveryCode.mockResolvedValue(mockUserInstance as any);
            cryptoService.generateHash.mockResolvedValue(null); // симулируем ошибку хеширования

            await expect(
                authService.applyNewPassword('new_pass', 'valid_code')
            ).rejects.toThrow(InternalServerErrorException);
        });

        it('should update password hash and save user if code and hash are valid', async () => {
            const mockUserInstance = { updatePasswordHash: jest.fn() };
            usersService.findUserByRecoveryCode.mockResolvedValue(mockUserInstance as any);
            cryptoService.generateHash.mockResolvedValue('new_hash_123');

            await authService.applyNewPassword('new_pass', 'valid_code');

            expect(cryptoService.generateHash).toHaveBeenCalledWith('new_pass');
            expect(mockUserInstance.updatePasswordHash).toHaveBeenCalledWith('new_hash_123');
            expect(usersService.saveUser).toHaveBeenCalledWith(mockUserInstance);
        });
    });

    describe('resendRegistrationEmail', () => {
        it('should throw DomainException if user is already confirmed (not found among unconfirmed)', async () => {
            usersService.findNotConfirmedByEmail.mockResolvedValue(null);

            await expect(
                authService.resendRegistrationEmail('already_confirmed@test.com')
            ).rejects.toThrow(DomainException);
        });

        it('should generate new confirmation code, save user, and resend email', async () => {
            const mockUserInstance = { generateConfirmationCode: jest.fn() };
            usersService.findNotConfirmedByEmail.mockResolvedValue(mockUserInstance as any);

            const uuidSpy = jest.spyOn(UUIDGeneratorUtil, 'generateUUID').mockReturnValue('new-conf-uuid')

            await authService.resendRegistrationEmail('unconfirmed@test.com');

            expect(mockUserInstance.generateConfirmationCode).toHaveBeenCalledWith('new-conf-uuid');
            expect(usersService.saveUser).toHaveBeenCalledWith(mockUserInstance);
            expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith('unconfirmed@test.com', 'new-conf-uuid');
        });
    });

    describe('getMeInfo', () => {
        it('should return user info from usersService', async () => {
            const mockMeInfo = { id: 'user-123', login: 'user', email: 'user@test.com' };
            usersService.getMeByIdOrNotFoundFail.mockResolvedValue(mockMeInfo as any);

            const result = await authService.getMeInfo('user-123');

            expect(result).toEqual(mockMeInfo);
            expect(usersService.getMeByIdOrNotFoundFail).toHaveBeenCalledWith('user-123');
        });
    });
});