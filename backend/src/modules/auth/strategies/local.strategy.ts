import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { UserWithoutPassword } from '../types/user.types';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
 constructor(private authService: AuthService) {
 super({
 usernameField: 'email',
 passwordField: 'password',
 });
 }

 async validate(
 email: string,
 password: string,
 ): Promise<UserWithoutPassword> {
 const user = await this.authService.validateUser(email, password);

 if (!user) {
 throw new UnauthorizedException('Credenciais inválidas');
 }

 return user;
 }
}
