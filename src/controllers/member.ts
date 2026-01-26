import { Request, Response } from "express";
import { db } from "@/db/db";
import { UserRole, FarmMemberRole, MemberStatus } from "@prisma/client";
import { sendFarmInvitationEmail } from "@/emails/farm-invitation";

// ==================== HELPER FUNCTIONS ====================

function sanitizeFarmMember(member: any) {
  return {
    id: member.id,
    farmId: member.farmId,
    userId: member.userId,
    role: member.role,
    permissions: member.permissions,
    specialty: member.specialty,
    assignedPaddocks: member.assignedPaddocks,
    assignedAnimals: member.assignedAnimals,
    status: member.status,
    invitedAt: member.invitedAt,
    acceptedAt: member.acceptedAt,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    user: member.user ? {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      phone: member.user.phone,
      role: member.user.role,
      imageUrl: member.user.imageUrl,
    } : null,
  };
}

// ==================== INVITE FARM MEMBER ====================

/**
 * Invite a user to join farm as member
 * POST /api/v1/farms/:farmId/members/invite
 */
export async function inviteFarmMember(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { farmId } = req.params;
    const {
      email,
      role, // VETERINARIAN | CARETAKER | OBSERVER
      permissions,
      specialty,
      assignedPaddocks,
      assignedAnimals,
    } = req.body;

    // Validation
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        error: "Email and role are required",
      });
    }

    // Validate role - only these roles can be invited
    const allowedRoles: FarmMemberRole[] = [
      FarmMemberRole.VETERINARIAN,
      FarmMemberRole.CARETAKER,
      FarmMemberRole.OBSERVER,
    ];

    if (!allowedRoles.includes(role as FarmMemberRole)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role. Allowed roles: VETERINARIAN, CARETAKER, OBSERVER",
      });
    }

    // Check if farm exists and user is owner or manager
    const farm = await db.farm.findUnique({
      where: { id: farmId },
      include: {
        owner: true,
        members: {
          where: {
            userId,
            role: { in: [FarmMemberRole.OWNER, FarmMemberRole.MANAGER] },
            status: MemberStatus.ACTIVE,
          },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    // Check authorization - must be owner or manager
    const isOwner = farm.ownerId === userId;
    const isManager = farm.members.length > 0;

    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        error: "Only farm owners or managers can invite members",
      });
    }

    // Find user by email
    const invitedUser = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        error: "User with this email not found. They need to register first.",
      });
    }

    // Check if user's role matches the member role being assigned
    const roleMapping: Record<FarmMemberRole, UserRole[]> = {
      [FarmMemberRole.VETERINARIAN]: [UserRole.VETERINARIAN],
      [FarmMemberRole.CARETAKER]: [UserRole.CARETAKER],
      [FarmMemberRole.OBSERVER]: [UserRole.OBSERVER],
      [FarmMemberRole.OWNER]: [UserRole.FARMER],
      [FarmMemberRole.MANAGER]: [UserRole.FARMER, UserRole.VETERINARIAN, UserRole.CARETAKER],
    };

    if (!roleMapping[role as FarmMemberRole]?.includes(invitedUser.role as UserRole)) {
      return res.status(400).json({
        success: false,
        error: `User must have ${role} role in their account. Current role: ${invitedUser.role}`,
      });
    }

    // Check if already a member
    const existingMember = await db.farmMember.findUnique({
      where: {
        farmId_userId: {
          farmId,
          userId: invitedUser.id,
        },
      },
    });

    if (existingMember) {
      if (existingMember.status === MemberStatus.ACTIVE) {
        return res.status(409).json({
          success: false,
          error: "User is already an active member of this farm",
        });
      }
      if (existingMember.status === MemberStatus.PENDING) {
        return res.status(409).json({
          success: false,
          error: "User already has a pending invitation",
        });
      }
    }

    // Create or update farm member invitation
    const farmMember = await db.farmMember.upsert({
      where: {
        farmId_userId: {
          farmId,
          userId: invitedUser.id,
        },
      },
      update: {
        role: role as FarmMemberRole,
        permissions: permissions || [],
        specialty: specialty || null,
        assignedPaddocks: assignedPaddocks || [],
        assignedAnimals: assignedAnimals || [],
        status: MemberStatus.PENDING,
        invitedAt: new Date(),
      },
      create: {
        farmId,
        userId: invitedUser.id,
        role: role as FarmMemberRole,
        permissions: permissions || [],
        specialty: specialty || null,
        assignedPaddocks: assignedPaddocks || [],
        assignedAnimals: assignedAnimals || [],
        status: MemberStatus.PENDING,
      },
      include: {
        user: true,
        farm: true,
      },
    });

    // Send invitation email
    try {
      await sendFarmInvitationEmail({
        to: invitedUser.email,
        userName: invitedUser.name,
        farmName: farm.name,
        role: role as FarmMemberRole,
        invitedBy: farm.owner.name,
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
    }

    // Create notification
    await db.notification.create({
      data: {
        userId: invitedUser.id,
        type: "MEMBER_JOINED",
        title: "Farm Invitation",
        message: `You've been invited to join ${farm.name} as ${role}`,
        priority: "HIGH",
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId,
        action: "MEMBER_INVITED",
        module: "farm_members",
        entityType: "FarmMember",
        entityId: farmMember.id,
        status: "SUCCESS",
        description: `Invited ${invitedUser.email} as ${role}`,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Farm member invited successfully",
      data: sanitizeFarmMember(farmMember),
    });
  } catch (error) {
    console.error("Invite farm member error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to invite farm member",
    });
  }
}

// ==================== ACCEPT/REJECT INVITATION ====================

/**
 * Accept farm membership invitation
 * POST /api/v1/farms/:farmId/members/accept
 */
export async function acceptFarmInvitation(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { farmId } = req.params;

    // Find pending invitation
    const invitation = await db.farmMember.findUnique({
      where: {
        farmId_userId: {
          farmId,
          userId,
        },
      },
      include: {
        farm: true,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: "Invitation not found",
      });
    }

    if (invitation.status !== MemberStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: "This invitation is no longer pending",
      });
    }

    // Accept invitation
    const updatedMember = await db.farmMember.update({
      where: {
        farmId_userId: {
          farmId,
          userId,
        },
      },
      data: {
        status: MemberStatus.ACTIVE,
        acceptedAt: new Date(),
      },
      include: {
        user: true,
        farm: true,
      },
    });

    // Notify farm owner
    await db.notification.create({
      data: {
        userId: invitation.farm.ownerId,
        type: "MEMBER_JOINED",
        title: "Member Joined",
        message: `${updatedMember.user.name} accepted the invitation to join ${invitation.farm.name}`,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId,
        action: "MEMBER_ACCEPTED",
        module: "farm_members",
        entityType: "FarmMember",
        entityId: updatedMember.id,
        status: "SUCCESS",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: sanitizeFarmMember(updatedMember),
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to accept invitation",
    });
  }
}

/**
 * Reject farm membership invitation
 * POST /api/v1/farms/:farmId/members/reject
 */
export async function rejectFarmInvitation(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { farmId } = req.params;

    const invitation = await db.farmMember.findUnique({
      where: {
        farmId_userId: {
          farmId,
          userId,
        },
      },
      include: {
        farm: true,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: "Invitation not found",
      });
    }

    if (invitation.status !== MemberStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: "This invitation is no longer pending",
      });
    }

    // Delete invitation
    await db.farmMember.delete({
      where: {
        farmId_userId: {
          farmId,
          userId,
        },
      },
    });

    // Notify farm owner
    await db.notification.create({
      data: {
        userId: invitation.farm.ownerId,
        type: "MEMBER_LEFT",
        title: "Invitation Rejected",
        message: `A user rejected the invitation to join ${invitation.farm.name}`,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId,
        action: "MEMBER_REJECTED",
        module: "farm_members",
        entityType: "FarmMember",
        status: "SUCCESS",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Invitation rejected",
    });
  } catch (error) {
    console.error("Reject invitation error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reject invitation",
    });
  }
}

// ==================== GET FARM MEMBERS ====================

/**
 * Get all members of a farm
 * GET /api/v1/farms/:farmId/members
 */
export async function getFarmMembers(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { farmId } = req.params;
    const { status, role } = req.query;

    // Check if user has access to this farm
    const farm = await db.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: {
            userId,
            status: MemberStatus.ACTIVE,
          },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    const isOwner = farm.ownerId === userId;
    const isMember = farm.members.length > 0;

    if (!isOwner && !isMember) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this farm",
      });
    }

    // Build query filters
    const where: any = { farmId };
    if (status) where.status = status;
    if (role) where.role = role;

    // Get members
    const members = await db.farmMember.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            imageUrl: true,
            licenseNumber: true,
            specialization: true,
            yearsOfExperience: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        members: members.map(sanitizeFarmMember),
        total: members.length,
      },
    });
  } catch (error) {
    console.error("Get farm members error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch farm members",
    });
  }
}

// ==================== UPDATE FARM MEMBER ====================

/**
 * Update farm member role, permissions, or assignments
 * PATCH /api/v1/farms/:farmId/members/:memberId
 */
export async function updateFarmMember(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { farmId, memberId } = req.params;
    const {
      role,
      permissions,
      specialty,
      assignedPaddocks,
      assignedAnimals,
      status,
    } = req.body;

    // Check authorization
    const farm = await db.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: {
            userId,
            role: { in: [FarmMemberRole.OWNER, FarmMemberRole.MANAGER] },
            status: MemberStatus.ACTIVE,
          },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    const isOwner = farm.ownerId === userId;
    const isManager = farm.members.length > 0;

    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        error: "Only farm owners or managers can update members",
      });
    }

    // Get current member
    const currentMember = await db.farmMember.findUnique({
      where: { id: memberId },
    });

    if (!currentMember || currentMember.farmId !== farmId) {
      return res.status(404).json({
        success: false,
        error: "Farm member not found",
      });
    }

    // Prevent owner role change
    if (currentMember.role === FarmMemberRole.OWNER) {
      return res.status(400).json({
        success: false,
        error: "Cannot modify farm owner",
      });
    }

    // Build update data
    const updateData: any = {};
    if (role && role !== FarmMemberRole.OWNER) {
      const allowedRoles: FarmMemberRole[] = [
        FarmMemberRole.VETERINARIAN,
        FarmMemberRole.CARETAKER,
        FarmMemberRole.OBSERVER,
      ];
      
      // Only owner can assign MANAGER role
      if (role === FarmMemberRole.MANAGER && !isOwner) {
        return res.status(403).json({
          success: false,
          error: "Only farm owner can assign MANAGER role",
        });
      }

      if (!allowedRoles.includes(role as FarmMemberRole) && role !== FarmMemberRole.MANAGER) {
        return res.status(400).json({
          success: false,
          error: "Invalid role",
        });
      }
      
      updateData.role = role;
    }

    if (permissions !== undefined) updateData.permissions = permissions;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (assignedPaddocks !== undefined) updateData.assignedPaddocks = assignedPaddocks;
    if (assignedAnimals !== undefined) updateData.assignedAnimals = assignedAnimals;
    if (status !== undefined) {
      if (status === MemberStatus.REMOVED || status === MemberStatus.INACTIVE) {
        updateData.status = status;
      }
    }

    // Update member
    const updatedMember = await db.farmMember.update({
      where: { id: memberId },
      data: updateData,
      include: {
        user: true,
      },
    });

    // Notify member of changes
    await db.notification.create({
      data: {
        userId: updatedMember.userId,
        type: "PERMISSION_CHANGED",
        title: "Farm Role Updated",
        message: `Your role or permissions have been updated in ${farm.name}`,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId,
        action: "MEMBER_UPDATED",
        module: "farm_members",
        entityType: "FarmMember",
        entityId: memberId,
        status: "SUCCESS",
        description: `Updated member: ${updatedMember.user.email}`,
        metadata: updateData,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Farm member updated successfully",
      data: sanitizeFarmMember(updatedMember),
    });
  } catch (error) {
    console.error("Update farm member error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update farm member",
    });
  }
}

// ==================== REMOVE FARM MEMBER ====================

/**
 * Remove a member from farm
 * DELETE /api/v1/farms/:farmId/members/:memberId
 */
export async function removeFarmMember(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { farmId, memberId } = req.params;
    const { reason } = req.body;

    // Check authorization
    const farm = await db.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: {
            userId,
            role: { in: [FarmMemberRole.OWNER, FarmMemberRole.MANAGER] },
            status: MemberStatus.ACTIVE,
          },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    const isOwner = farm.ownerId === userId;
    const isManager = farm.members.length > 0;

    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        error: "Only farm owners or managers can remove members",
      });
    }

    // Get member to remove
    const memberToRemove = await db.farmMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!memberToRemove || memberToRemove.farmId !== farmId) {
      return res.status(404).json({
        success: false,
        error: "Farm member not found",
      });
    }

    // Cannot remove owner
    if (memberToRemove.role === FarmMemberRole.OWNER) {
      return res.status(400).json({
        success: false,
        error: "Cannot remove farm owner",
      });
    }

    // Managers can't remove other managers (only owner can)
    if (memberToRemove.role === FarmMemberRole.MANAGER && !isOwner) {
      return res.status(403).json({
        success: false,
        error: "Only farm owner can remove managers",
      });
    }

    // Mark as removed instead of deleting (for audit trail)
    await db.farmMember.update({
      where: { id: memberId },
      data: {
        status: MemberStatus.REMOVED,
      },
    });

    // Notify removed member
    await db.notification.create({
      data: {
        userId: memberToRemove.userId,
        type: "MEMBER_LEFT",
        title: "Removed from Farm",
        message: `You have been removed from ${farm.name}${reason ? `. Reason: ${reason}` : ''}`,
        priority: "HIGH",
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId,
        action: "MEMBER_REMOVED",
        module: "farm_members",
        entityType: "FarmMember",
        entityId: memberId,
        status: "SUCCESS",
        description: `Removed member: ${memberToRemove.user.email}`,
        metadata: { reason },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Farm member removed successfully",
    });
  } catch (error) {
    console.error("Remove farm member error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to remove farm member",
    });
  }
}

// ==================== LEAVE FARM ====================

/**
 * Leave a farm (self-remove)
 * POST /api/v1/farms/:farmId/members/leave
 */
export async function leaveFarm(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { farmId } = req.params;

    const membership = await db.farmMember.findUnique({
      where: {
        farmId_userId: {
          farmId,
          userId,
        },
      },
      include: {
        farm: true,
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: "You are not a member of this farm",
      });
    }

    if (membership.role === FarmMemberRole.OWNER) {
      return res.status(400).json({
        success: false,
        error: "Farm owner cannot leave. Transfer ownership first.",
      });
    }

    // Mark as removed
    await db.farmMember.update({
      where: {
        farmId_userId: {
          farmId,
          userId,
        },
      },
      data: {
        status: MemberStatus.REMOVED,
      },
    });

    // Notify farm owner
    await db.notification.create({
      data: {
        userId: membership.farm.ownerId,
        type: "MEMBER_LEFT",
        title: "Member Left Farm",
        message: `A member has left ${membership.farm.name}`,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId,
        action: "MEMBER_LEFT",
        module: "farm_members",
        entityType: "FarmMember",
        entityId: membership.id,
        status: "SUCCESS",
      },
    });

    return res.status(200).json({
      success: true,
      message: "You have left the farm successfully",
    });
  } catch (error) {
    console.error("Leave farm error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to leave farm",
    });
  }
}