import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { UsersQueryRepository } from '../infrastructure/query/users.query-repository';
import { SQLUserViewDto, UserViewDto } from './view-dto/users.view-dto';
import { UsersService } from '../application/users.service';
import { CreateUserInputDto } from './input-dto/users.input-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { UpdateUserInputDto } from './input-dto/update-user.input-dto';
import { GetUsersQueryParams } from './input-dto/get-users-query-params.input-dto';
import { BasicAuthGuard } from '../../authorisation/guards/basic/basic.auth-guard';
import { IdParamInputDto } from './input-dto/id-param.input-dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetAllUsers } from '../application/usecases/get-all-users.usecase';
import { CreateUser } from '../application/usecases/create-user.usecase';
import { GetUserByIdOrNotFoundFail } from '../application/usecases/get-user-by-id.usecase';
import { DeleteUserCommand } from '../application/usecases/delete-user.usecase';

@ApiTags('Users endpoint')
@Controller('/sa/users')
export class UsersController {
    constructor(
        private usersQueryRepository: UsersQueryRepository,
        private usersService: UsersService,
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {
        console.log('UsersController created');
    }


    // Returns all users
    @UseGuards(BasicAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Get()
    async getAllUsers(
        @Query() query: GetUsersQueryParams,
    ): Promise<PaginatedViewDto<UserViewDto>> {
        const result = await this.queryBus.execute<GetAllUsers>(
            new GetAllUsers(query),
        );

        return result;
    }

    // Adds new user to the system
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(BasicAuthGuard)
    @Post()
    async createUser(@Body() body: CreateUserInputDto): Promise<UserViewDto> {
        // const userId = await this.usersService.createUser(body);

        const userId = await this.commandBus.execute<string>(
            new CreateUser(body),
        );

        // console.log('userId', userId);

        return await this.queryBus.execute<SQLUserViewDto>(
            new GetUserByIdOrNotFoundFail(userId),
        );
    }

    // Deletes user specified by id
    @UseGuards(BasicAuthGuard)
    @ApiParam({ name: 'id' }) //для сваггера
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(':id')
    async deleteUser(@Param() idParam: IdParamInputDto): Promise<void> {
        return await this.commandBus.execute<void>(
            new DeleteUserCommand(idParam.id),
        );
    }


    // @UseGuards(BasicAuthGuard)
    // @ApiParam({ name: 'id' }) //для сваггера
    // @Get(':id') //users/232342-sdfssdf-23234323
    // async getById(@Param() idParam: IdParamInputDto): Promise<UserViewDto> {
    //     // можем и чаще так и делаем возвращать Promise из action. Сам NestJS будет дожидаться, когда
    //     // промис зарезолвится и затем NestJS вернёт результат клиенту
    //     return this.usersQueryRepository.getByIdOrNotFoundFail(idParam.id);
    // }


    // @UseGuards(BasicAuthGuard)
    // @Put(':id')
    // async updateUser(
    //     @Param() idParam: IdParamInputDto,
    //     @Body() body: UpdateUserInputDto,
    // ): Promise<UserViewDto> {
    //     const userId = await this.usersService.updateUser(idParam.id, body);
    //
    //     return this.usersQueryRepository.getByIdOrNotFoundFail(userId);
    // }
}
