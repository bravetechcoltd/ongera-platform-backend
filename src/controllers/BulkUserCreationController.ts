// @ts-nocheck
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import dbConnection from '../database/db';
import { User, AccountType, BwengeRole, InstitutionRole, InstitutionPortalRole } from "../database/models/User";
import { UserProfile } from "../database/models/UserProfile";
import { BulkUserCreation, BulkCreationStatus } from "../database/models/BulkUserCreation";
import { InstructorStudent } from "../database/models/InstructorStudent";
import { sendInstructorCredentials, sendStudentCredentials, buildPortalEmail } from "../services/emailTemplates";
import { sendEmail } from "../helpers/utils";
import * as XLSX from 'xlsx';

export class BulkUserCreationController {

static async parseExcelFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required"
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    let instructorSheet: XLSX.WorkSheet | null = null;
    let studentSheet: XLSX.WorkSheet | null = null;

    for (const sheetName of workbook.SheetNames) {
      const lowerName = sheetName.toLowerCase().trim();
      if (lowerName === 'instructors' || lowerName === 'instructor') {
        instructorSheet = workbook.Sheets[sheetName];
        break;
      }
    }

    for (const sheetName of workbook.SheetNames) {
      const lowerName = sheetName.toLowerCase().trim();
      if (lowerName === 'students' || lowerName === 'student') {
        studentSheet = workbook.Sheets[sheetName];
        break;
      }
    }

    if (!instructorSheet || !studentSheet) {
      return res.status(400).json({
        success: false,
        message: `Excel file must contain both 'Instructors' and 'Students' sheets. Found: ${workbook.SheetNames.join(', ')}`,
        availableSheets: workbook.SheetNames
      });
    }

    const instructorsRaw = XLSX.utils.sheet_to_json(instructorSheet);
    const studentsRaw = XLSX.utils.sheet_to_json(studentSheet);

    const getField = (row: any, possibleNames: string[]) => {
      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return String(row[name]).trim();
        }
      }
      return '';
    };

    const instructors = instructorsRaw.map((row: any) => ({
      first_name: getField(row, ['first_name', 'First Name', 'firstname', 'FirstName', 'First_Name']),
      last_name: getField(row, ['last_name', 'Last Name', 'lastname', 'LastName', 'Last_Name']),
      email: getField(row, ['email', 'Email', 'EMAIL', 'Email Address']),
      phone_number: getField(row, ['phone_number', 'Phone Number', 'phone', 'Phone', 'PhoneNumber']),
      department: getField(row, ['department', 'Department', 'DEPARTMENT', 'Dept'])
    })).filter(instructor => 
      instructor.email && instructor.first_name && instructor.last_name
    );

    const students = studentsRaw.map((row: any) => ({
      first_name: getField(row, ['first_name', 'First Name', 'firstname', 'FirstName', 'First_Name']),
      last_name: getField(row, ['last_name', 'Last Name', 'lastname', 'LastName', 'Last_Name']),
      email: getField(row, ['email', 'Email', 'EMAIL', 'Email Address']),
      phone_number: getField(row, ['phone_number', 'Phone Number', 'phone', 'Phone', 'PhoneNumber']),
      assigned_instructor_email: getField(row, [
        'assigned_instructor_email', 'Assigned Instructor Email', 'instructor_email', 
        'Instructor Email', 'InstructorEmail', 'Assigned Instructor'
      ]),
      academic_year: getField(row, ['academic_year', 'Academic Year', 'AcademicYear', 'Year']),
      semester: getField(row, ['semester', 'Semester', 'SEMESTER', 'Term']),
      department: getField(row, ['department', 'Department', 'DEPARTMENT', 'Dept']),
      registration_number: getField(row, ['registration_number', 'Registration Number', 'RegNumber', 'Reg Number', 'Student ID'])
    })).filter(student => 
      student.email && student.first_name && student.last_name && student.assigned_instructor_email
    );

    if (instructors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid instructor data found. Ensure the Instructors sheet has: first_name, last_name, and email columns."
      });
    }

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid student data found. Ensure the Students sheet has: first_name, last_name, email, and assigned_instructor_email columns."
      });
    }

    const instructorEmails = new Set(instructors.map(i => i.email.toLowerCase()));
    const invalidStudents = students.filter(
      s => !instructorEmails.has(s.assigned_instructor_email.toLowerCase())
    );

    const warnings = [];
    if (invalidStudents.length > 0) {
      warnings.push(`${invalidStudents.length} students have instructor emails that don't match any instructor in the file`);
    }
    
    const missingPortalFields = students.filter(s => !s.academic_year || !s.semester);
    if (missingPortalFields.length > 0) {
      warnings.push(`${missingPortalFields.length} students are missing academic_year or semester (required for institution portal)`);
    }

    res.json({
      success: true,
      data: {
        instructors,
        students,
        totalInstructors: instructors.length,
        totalStudents: students.length,
        warnings
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to parse Excel file",
      error: error.message
    });
  }
}

static generateRandomPassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

static async downloadTemplate(req: Request, res: Response) {
  try {
    const workbook = XLSX.utils.book_new();

    const instructorsData = [
      {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone_number: '+250788123456',
        department: 'Computer Science'
      },
      {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone_number: '+250788234567',
        department: 'Mathematics'
      }
    ];

    const instructorsSheet = XLSX.utils.json_to_sheet(instructorsData);
    XLSX.utils.book_append_sheet(workbook, instructorsSheet, 'Instructors');

    const studentsData = [
      {
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice.j@student.com',
        phone_number: '+250788345678',
        assigned_instructor_email: 'john.doe@example.com',
        academic_year: '2024-2025',
        semester: 'FIRST',
        department: 'Computer Science',
        registration_number: '22RP12345'
      },
      {
        first_name: 'Bob',
        last_name: 'Wilson',
        email: 'bob.w@student.com',
        phone_number: '+250788456789',
        assigned_instructor_email: 'john.doe@example.com',
        academic_year: '2024-2025',
        semester: 'FIRST',
        department: 'Computer Science',
        registration_number: '22RP12346'
      },
      {
        first_name: 'Charlie',
        last_name: 'Brown',
        email: 'charlie.b@student.com',
        phone_number: '+250788567890',
        assigned_instructor_email: 'jane.smith@example.com',
        academic_year: '2024-2025',
        semester: 'SECOND',
        department: 'Mathematics',
        registration_number: '22RP12347'
      }
    ];

    const studentsSheet = XLSX.utils.json_to_sheet(studentsData);
    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Students');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=bulk_users_template.xlsx');
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message
    });
  }
}

static async createBulkUsers(req: Request, res: Response) {
  try {
    const creatorId = req.user.userId;
    const { instructors, students } = req.body;

    if (!instructors || !Array.isArray(instructors) || instructors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one instructor is required"
      });
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one student is required"
      });
    }

    const userRepo = dbConnection.getRepository(User);
    const creator = await userRepo.findOne({
      where: { id: creatorId },
      relations: ["profile"]
    });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (creator.account_type !== AccountType.INSTITUTION) {
      return res.status(403).json({
        success: false,
        message: "Only institutions can create bulk users"
      });
    }

    const institutionName = creator.profile?.institution_name || creator.first_name;

    const bulkCreationRepo = dbConnection.getRepository(BulkUserCreation);
    const bulkCreation = bulkCreationRepo.create({
      creator,
      instructors,
      students,
      status: BulkCreationStatus.PROCESSING,
      total_instructors: instructors.length,
      total_students: students.length,
      processed_instructors: 0,
      processed_students: 0
    });

    await bulkCreationRepo.save(bulkCreation);

    // Process asynchronously
    BulkUserCreationController.processBulkCreation(
      bulkCreation.id,
      instructors,
      students,
      institutionName,
      creatorId
    ).catch(err => console.error("Bulk creation error:", err));

    res.status(202).json({
      success: true,
      message: "Bulk user creation started",
      data: {
        bulkCreationId: bulkCreation.id,
        status: bulkCreation.status,
        totalInstructors: instructors.length,
        totalStudents: students.length
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to start bulk user creation",
      error: error.message
    });
  }
}

static async processBulkCreation(
  bulkCreationId: string,
  instructors: any[],
  students: any[],
  institutionName: string,
  creatorId: string
) {
  const bulkCreationRepo = dbConnection.getRepository(BulkUserCreation);
  const userRepo = dbConnection.getRepository(User);
  const profileRepo = dbConnection.getRepository(UserProfile);
  const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

  try {
    const bulkCreation = await bulkCreationRepo.findOne({
      where: { id: bulkCreationId }
    });

    if (!bulkCreation) return;

    const createdInstructors: Map<string, User> = new Map();
    const createdStudents: User[] = [];

    // === PROCESS INSTRUCTORS ===
    for (const instructorData of instructors) {
      try {
        const password = BulkUserCreationController.generateRandomPassword();
        const password_hash = await bcrypt.hash(password, 12);

        let instructor = await userRepo.findOne({
          where: { email: instructorData.email }
        });

        if (!instructor) {
          // Create new instructor account
          instructor = userRepo.create({
            email: instructorData.email,
            password_hash,
            first_name: instructorData.first_name,
            last_name: instructorData.last_name,
            phone_number: instructorData.phone_number,
            account_type: AccountType.RESEARCHER,
            username: instructorData.email.split("@")[0] + "_" + Date.now(),
            is_verified: true,
            is_active: true
          });

          await userRepo.save(instructor);

          const profile = profileRepo.create({
            user: instructor,
            department: instructorData.department,
            institution_name: institutionName
          });
          await profileRepo.save(profile);

          // Send credential email
          await sendInstructorCredentials(
            instructor.email,
            instructor.first_name,
            instructor.last_name,
            password,
            institutionName
          );
        }

        // === KEY: Register as institution portal member ===
        instructor.is_institution_member = true;
        instructor.primary_institution_id = creatorId;
        const existingIds = instructor.institution_ids || [];
        if (!existingIds.includes(creatorId)) {
          instructor.institution_ids = [...existingIds, creatorId];
        }
        instructor.institution_role = InstitutionRole.INSTRUCTOR;
        if (
          instructor.bwenge_role !== BwengeRole.INSTITUTION_ADMIN &&
          instructor.bwenge_role !== BwengeRole.SYSTEM_ADMIN
        ) {
          instructor.bwenge_role = BwengeRole.INSTRUCTOR;
        }
        await userRepo.save(instructor);

        // Send portal welcome email
        try {
          const name = instructor.first_name || "there";
          await sendEmail({
            to: instructor.email,
            subject: `You've been added as an instructor at ${institutionName} on Bwenge`,
            html: buildPortalEmail(
              `Welcome to ${institutionName}'s portal`,
              `<p>Hi ${name},</p>
               <p><b>${institutionName}</b> has added you as an instructor in their institution portal. You can now supervise students and review their research projects.</p>
               <p>Sign in to your Bwenge dashboard to access your institution portal.</p>`
            )
          });
        } catch (e) {
          console.error("Portal email failed for instructor:", e);
        }

        createdInstructors.set(instructorData.email, instructor);
        bulkCreation.processed_instructors += 1;
        await bulkCreationRepo.save(bulkCreation);

      } catch (error: any) {
        console.error("Error processing instructor:", error);
      }
    }

    // === PROCESS STUDENTS ===
    for (const studentData of students) {
      try {
        const password = BulkUserCreationController.generateRandomPassword();
        const password_hash = await bcrypt.hash(password, 12);

        let student = await userRepo.findOne({
          where: { email: studentData.email }
        });

        if (!student) {
          // Create new student account
          student = userRepo.create({
            email: studentData.email,
            password_hash,
            first_name: studentData.first_name,
            last_name: studentData.last_name,
            phone_number: studentData.phone_number,
            account_type: AccountType.STUDENT,
            username: studentData.email.split("@")[0] + "_" + Date.now(),
            is_verified: true,
            is_active: true
          });

          await userRepo.save(student);

          const profile = profileRepo.create({
            user: student,
            institution_name: institutionName
          });
          await profileRepo.save(profile);
        }

        const instructor = createdInstructors.get(studentData.assigned_instructor_email);
        if (instructor) {
          const existingLink = await instructorStudentRepo.findOne({
            where: {
              instructor: { id: instructor.id },
              student: { id: student.id },
              institution_id: creatorId
            }
          });

          if (!existingLink) {
            // === KEY: Create InstructorStudent link with portal fields ===
            const link = instructorStudentRepo.create({
              instructor,
              student,
              institution_id: creatorId,
              academic_year: studentData.academic_year || null,
              semester: studentData.semester || null,
              department: studentData.department || null,
              registration_number: studentData.registration_number || null,
              is_institution_portal_member: true,
              assigned_at: new Date()
            });
            await instructorStudentRepo.save(link);
          }

          // === KEY: Register student as institution member ===
          student.is_institution_member = true;
          if (!student.primary_institution_id) {
            student.primary_institution_id = creatorId;
          }
          const existingIds = student.institution_ids || [];
          if (!existingIds.includes(creatorId)) {
            student.institution_ids = [...existingIds, creatorId];
          }
          student.institution_role = InstitutionRole.MEMBER;
          await userRepo.save(student);

          // Send portal welcome email with detail rows
          try {
            const detailRows: string[] = [];
            const instructorName = `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.email;
            if (instructorName) detailRows.push(`<li><b>Instructor:</b> ${instructorName}</li>`);
            if (studentData.academic_year) detailRows.push(`<li><b>Academic year:</b> ${studentData.academic_year}</li>`);
            if (studentData.semester) detailRows.push(`<li><b>Semester:</b> ${studentData.semester}</li>`);
            if (studentData.department) detailRows.push(`<li><b>Department:</b> ${studentData.department}</li>`);
            if (studentData.registration_number) detailRows.push(`<li><b>Registration number:</b> ${studentData.registration_number}</li>`);
            const studentName = student.first_name || "there";

            await sendEmail({
              to: student.email,
              subject: `You've been added to ${institutionName} on Bwenge`,
              html: buildPortalEmail(
                `Welcome to ${institutionName}'s portal`,
                `<p>Hi ${studentName},</p>
                 <p><b>${institutionName}</b> has added you as a portal student. You can now collaborate on institution research projects under their academic supervision.</p>
                 ${detailRows.length ? `<ul>${detailRows.join("")}</ul>` : ""}
                 <p>Sign in to your Bwenge dashboard to view your institution portal.</p>`
              )
            });
          } catch (e) {
            console.error("Portal email failed for student:", e);
          }

          // Also send credential email
          await sendStudentCredentials(
            student.email,
            student.first_name,
            student.last_name,
            password,
            `${instructor.first_name} ${instructor.last_name}`,
            institutionName
          );
        }

        createdStudents.push(student);
        bulkCreation.processed_students += 1;
        await bulkCreationRepo.save(bulkCreation);

      } catch (error: any) {
        console.error("Error processing student:", error);
      }
    }

    bulkCreation.status = BulkCreationStatus.COMPLETED;
    bulkCreation.completed_at = new Date();
    await bulkCreationRepo.save(bulkCreation);

  } catch (error: any) {
    console.error("Bulk creation error:", error);
    const bulkCreation = await bulkCreationRepo.findOne({
      where: { id: bulkCreationId }
    });
    
    if (bulkCreation) {
      bulkCreation.status = BulkCreationStatus.FAILED;
      bulkCreation.error_message = error.message;
      await bulkCreationRepo.save(bulkCreation);
    }
  }
}

static async getBulkCreationStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const bulkCreationRepo = dbConnection.getRepository(BulkUserCreation);
    const bulkCreation = await bulkCreationRepo.findOne({
      where: { id },
      relations: ["creator"]
    });

    if (!bulkCreation) {
      return res.status(404).json({
        success: false,
        message: "Bulk creation not found"
      });
    }

    res.json({
      success: true,
      data: bulkCreation
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get bulk creation status",
      error: error.message
    });
  }
}

static async getInstructorStudents(req: Request, res: Response) {
  try {
    const instructorId = req.user.userId;

    const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
    const links = await instructorStudentRepo.find({
      where: { instructor: { id: instructorId } },
      relations: ["student", "student.profile"]
    });

    res.json({
      success: true,
      data: {
        students: links.map(link => link.student),
        totalStudents: links.length
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get instructor students",
      error: error.message
    });
  }
}
}