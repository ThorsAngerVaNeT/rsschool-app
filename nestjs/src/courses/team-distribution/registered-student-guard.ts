import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CourseRole, CurrentRequest } from 'src/auth';
import { TeamDistributionStudentService } from './team-distribution-student.service';

@Injectable()
export class RegisteredStudentOrPowerUserGuard implements CanActivate {
  constructor(private teamDistributionStudentService: TeamDistributionStudentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const [request] = context.getArgs<[CurrentRequest]>();
    const courseId = Number(request.params.courseId);
    const studentId = request.user.courses[courseId]?.studentId;
    const distributionId = Number(request.params.id);
    const isPowerUser =
      request.user.isAdmin ||
      request.user.courses[courseId]?.roles.includes(CourseRole.Manager) ||
      request.user.courses[courseId]?.roles.includes(CourseRole.Dementor);

    if (isPowerUser) {
      return true;
    }

    if (!courseId || !studentId) {
      throw new UnauthorizedException();
    }

    const registration = await this.teamDistributionStudentService.getTeamDistributionStudent(
      studentId,
      distributionId,
    );

    if (!registration?.active && !registration?.distributed) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
