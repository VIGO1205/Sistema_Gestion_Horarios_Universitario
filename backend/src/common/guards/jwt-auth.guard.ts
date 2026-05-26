import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest();
		const authorization = request.headers.authorization || request.headers.Authorization;

		if (!authorization || typeof authorization !== 'string') {
			throw new UnauthorizedException();
		}

		const [scheme, token] = authorization.split(' ');
		if (scheme !== 'Bearer' || !token) {
			throw new UnauthorizedException();
		}

		try {
			const secret = process.env.JWT_SECRET || 'secret-key';
			request.user = jwt.verify(token, secret);
			return true;
		} catch {
			throw new UnauthorizedException();
		}
	}
}
