import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { SignupResponse } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma.service';
import { LoginDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(payload: CreateUserDto): Promise<SignupResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    //save de user password in encrypted format
    const hash = await this.encryptPassword(payload.password, 10);
    //saved the user in db
    payload.password = hash;
    //return id and email
    if (existingUser) {
      throw new BadRequestException(
        'User created with the email you provided',
        {
          cause: new Error(),
          description: 'User already exists',
        },
      );
    }
    return await this.prisma.user.create({
      data: payload,
      select: {
        email: true,
        id: true,
      },
    });
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    //find user based email

    // find user based on email
    const user = await this.prisma.user.findFirst({
      where: {
        email: loginDto.email,
      },
    });
    // if there is no user we can unauthorized
    if (!user) {
      throw new UnauthorizedException();
    }
    // decrypt the user password
    const isMatched = await this.decryptPassword(
      loginDto.password,
      user.password,
    );
    if (!isMatched) {
      throw new UnauthorizedException('Invalid password');
    }
    // match the user provided password with decrypted
    // if password not matched then send the error invalid password
    const accessToken = await this.jwtService.signAsync(
      {
        email: user.email,
        id: user.id,
        role: user.role,
      },
      { expiresIn: '1d' },
    );
    // return json web token
    return { accessToken };
  }

  // create(createUserDto: CreateUserDto) {
  //   return createUserDto;
  // }

  // findAll() {
  //   return `This action returns all users`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} user`;
  // }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} user`;
  // }

  async encryptPassword(plainText: string, saltRound: string | number) {
    return await bcrypt.hash(plainText, saltRound);
  }
  async decryptPassword(plainText: string, hash: string) {
    return await bcrypt.compare(plainText, hash);
  }
}
