import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from '../feature-flags.service';
import { FEATURE_FLAG_KEY } from '../decorators/feature-flag.decorator';
import { FeatureFlagContext } from '../feature-flags.types';

/**
 * Guard that checks if a required feature flag is enabled
 *
 * Use with @RequireFeatureFlag() decorator to protect endpoints
 * behind feature flags.
 *
 * @see #865 - Feature Flags: Escolha e setup de provider
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFlag = this.reflector.getAllAndOverride<string>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No flag required, allow access
    if (!requiredFlag) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const flagContext: FeatureFlagContext = {
      userId: user?.userId,
      organizationId: user?.organizationId,
    };

    const isEnabled = await this.featureFlagsService.isEnabled(
      requiredFlag,
      flagContext,
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        `Feature '${requiredFlag}' is not available for your account`,
      );
    }

    return true;
  }
}
