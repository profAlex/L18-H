import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Length,
    Matches,
} from 'class-validator';

export class RegisterNewUserDto {
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
    password: string = '';

    @ApiProperty()
    // @IsNotEmpty()
    @IsString()
    // @IsEmail()
    @Matches('^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
    email: string = '';
}
