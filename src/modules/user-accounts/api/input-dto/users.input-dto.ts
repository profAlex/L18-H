import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Length,
    Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserInputDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Length(3, 10)
    @Matches(/^[a-zA-Z0-9_-]*$/)
    login: string = '';

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Length(6, 20)
    password: string = ''; // Инициализируем пустой строкой

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email: string = ''; // Инициализируем пустой строкой
}
