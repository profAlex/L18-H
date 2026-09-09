import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdParamInputDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    id: string = '';
}
