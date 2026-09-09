import { UpdateUserDto } from '../../dto/create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserInputDto implements UpdateUserDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    email: string = '';
}
