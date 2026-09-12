import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChangePasswordDto, UpdateProfileDto } from './dto/auth.dto';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('update')
  updateProfile(@Request() req, @Body() data: UpdateProfileDto) {
    // DTO membatasi field yang boleh diubah menjadi name dan username saja.
    return this.usersService.update(req.user.id, {
      name: data.name,
      username: data.username,
    });
  }

  @Patch('change-password')
  changePassword(@Request() req, @Body() data: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, data);
  }
}
