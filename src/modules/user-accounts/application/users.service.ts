import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserModelType } from '../domain/user.entity';
import { CreateUserDto, UpdateUserDto } from '../dto/create-user.dto';
import { UsersCommandRepository } from '../infrastructure/users.command-repository';
import { CryptoService } from '../../../core/bcrypt/bcrypt.service';
import { UUIDGeneratorUtil } from '../../../core/uuid-generation/uuid.service';
import { UsersQueryRepository } from '../infrastructure/query/users.query-repository';
import { UserAuthInternalDto } from '../../authorisation/dto/internal-dto/users.auth-internal-dto';
import { MeViewDto } from '../../authorisation/api/view-dto/me.view-dto';

@Injectable()
export class UsersService {
    constructor(
        //инжектирование модели в сервис через DI
        @InjectModel(User.name) private UserModel: UserModelType,
        private usersCommandRepository: UsersCommandRepository,
        private usersQueryRepository: UsersQueryRepository,
        private cryptoService: CryptoService,
    ) {}

    async createUser(dto: CreateUserDto): Promise<string> {
        const passwordHash = await this.cryptoService.generateHash(
            dto.password,
        );
        // console.log('<------------TEST HERE2');

        if (!passwordHash) {
            throw new InternalServerErrorException("Couldn't generate hash");
        }
        const confirmationCode = UUIDGeneratorUtil.generateUUID();
        // console.log('<------------TEST HERE3');
        const newUser = this.UserModel.createInstance({
            login: dto.login,
            email: dto.email,
            passwordHash: passwordHash,
            confirmationCode: confirmationCode,
        });

        // console.log('<------------TEST HERE4');

        await this.usersCommandRepository.save(newUser);

        return newUser._id.toString();
    }

    async updateUser(id: string, dto: UpdateUserDto): Promise<string> {
        const user = await this.usersCommandRepository.findOrNotFoundFail(id);

        // не присваиваем св-ва сущностям напрямую в сервисах! даже для изменения одного св-ва
        // создаём метод
        user.update(dto); // change detection

        await this.usersCommandRepository.save(user);

        return user._id.toString();
    }

    async deleteUser(id: string) {
        const user = await this.usersCommandRepository.findOrNotFoundFail(id);

        user.makeDeleted();

        await this.usersCommandRepository.save(user);
    }

    async saveUser(user: UserDocument): Promise<void> {
        await this.usersCommandRepository.save(user);
    }

    async findOrNotFoundFail(id: string): Promise<UserDocument> {
        return this.usersCommandRepository.findOrNotFoundFail(id);
    }

    async checkIfUserExists(
        login: string,
        email: string,
    ): Promise<'login' | 'email' | null> {
        return this.usersQueryRepository.checkIfUserExists(login, email);
    }

    async findUserByLogin(
        loginOrEmail: string,
    ): Promise<UserAuthInternalDto | null> {
        return this.usersQueryRepository.findUserByLogin(loginOrEmail);
    }

    async findUserByConfirmationCode(
        confirmationCode: string,
    ): Promise<UserDocument | null> {
        return this.usersQueryRepository.findUserByConfirmationCode(
            confirmationCode,
        );
    }

    async findConfirmedUserByEmail(
        sentEmail: string,
    ): Promise<UserDocument | null> {
        return this.usersQueryRepository.findConfirmedUserByEmail(sentEmail);
    }

    async findUserByRecoveryCode(
        sentRecoveryCode: string,
    ): Promise<UserDocument | null> {
        return this.usersQueryRepository.findUserByRecoveryCode(
            sentRecoveryCode,
        );
    }

    async findNotConfirmedByEmail(
        sentEmail: string,
    ): Promise<UserDocument | null> {
        return this.usersQueryRepository.findNotConfirmedByEmail(sentEmail);
    }

    async getMeByIdOrNotFoundFail(id: string): Promise<MeViewDto> {
        return this.usersQueryRepository.getMeByIdOrNotFoundFail(id);
    }
}
