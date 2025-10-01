// @ts-nocheck
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import dbConnection from '../database/db';
import { User, AccountType } from "../database/models/User";
import { UserProfile } from "../database/models/UserProfile";
import { BulkUserCreation, BulkCreationStatus } from "../database/models/BulkUserCreation";
import { InstructorStudent } from "../database/models/InstructorStudent";
import { sendInstructorCredentials, sendStudentCredentials } from "../services/emailTemplates";
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
    
    let instructorSheetName = '';
    let studentSheetName = '';

    for (const sheetName of workbook.SheetNames) {
      const lowerName = sheetName.toLowerCase().trim();
      if (lowerName === 'instructors' || lowerName === 'instructor') {
        instructorSheet = workbook.Sheets[sheetName];
        instructorSheetName = sheetName;
        break;
      }
    }

    for (const sheetName of workbook.SheetNames) {
      const lowerName = sheetName.toLowerCase().trim();
      if (lowerName === 'students' || lowerName === 'student') {
        studentSheet = workbook.Sheets[sheetName];
        studentSheetName = sheetName;
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

    const instructors = instructorsRaw.map((row: any) => {
      const getField = (possibleNames: string[]) => {
        for (const name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return String(row[name]).trim();
          }
        }
        return '';
      };

      return {
        first_name: getField(['first_name', 'First Name', 'firstname', 'FirstName', 'First_Name']),
        last_name: getField(['last_name', 'Last Name', 'lastname', 'LastName', 'Last_Name']),
        email: getField(['email', 'Email', 'EMAIL', 'Email Address']),
        phone_number: getField(['phone_number', 'Phone Number', 'phone', 'Phone', 'PhoneNumber']),
        department: getField(['department', 'Department', 'DEPARTMENT', 'Dept'])
      };
    }).filter(instructor => 
      instructor.email && 
      instructor.first_name && 
      instructor.last_name
    );

    const students = studentsRaw.map((row: any) => {
      const getField = (possibleNames: string[]) => {
        for (const name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return String(row[name]).trim();
          }
        }
        return '';
      };

      return {
        first_name: getField(['first_name', 'First Name', 'firstname', 'FirstName', 'First_Name']),
        last_name: getField(['last_name', 'Last Name', 'lastname', 'LastName', 'Last_Name']),
        email: getField(['email', 'Email', 'EMAIL', 'Email Address']),
        phone_number: getField(['phone_number', 'Phone Number', 'phone', 'Phone', 'PhoneNumber']),
        assigned_instructor_email: getField([
          'assigned_instructor_email', 
          'Assigned Instructor Email', 
          'instructor_email', 
          'Instructor Email',
          'InstructorEmail',
          'Assigned Instructor'
        ])
      };
    }).filter(student => 
      student.email && 
      student.first_name && 
      student.last_name && 
      student.assigned_instructor_email
    );

    if (instructors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid instructor data found. Please ensure the Instructors sheet has: first_name, last_name, and email columns."
      });
    }

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid student data found. Please ensure the Students sheet has: first_name, last_name, email, and assigned_instructor_email columns."
      });
    }

    const instructorEmails = new Set(instructors.map(i => i.email.toLowerCase()));
    const invalidStudents = students.filter(
      s => !instructorEmails.has(s.assigned_instructor_email.toLowerCase())
    );

    res.json({
      success: true,
      data: {
        instructors,
        students,
        totalInstructors: instructors.length,
        totalStudents: students.length,
        warnings: invalidStudents.length > 0 ? [
          `${invalidStudents.length} students have instructor emails that don't match any instructor in the file`
        ] : []
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to parse Excel file",
      error: error.message,
      details: "Please ensure the file is a valid Excel file (.xlsx or .xls) with proper sheet names."
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
        assigned_instructor_email: 'john.doe@example.com'
      },
      {
        first_name: 'Bob',
        last_name: 'Wilson',
        email: 'bob.w@student.com',
        phone_number: '+250788456789',
        assigned_instructor_email: 'john.doe@example.com'
      },
      {
        first_name: 'Charlie',
        last_name: 'Brown',
        email: 'charlie.b@student.com',
        phone_number: '+250788567890',
        assigned_instructor_email: 'jane.smith@example.com'
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

      BulkUserCreationController.processBulkCreation(
        bulkCreation.id,
        instructors,
        students,
        institutionName
      ).catch(err => {
      });

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
    institutionName: string
  ) {
    const bulkCreationRepo = dbConnection.getRepository(BulkUserCreation);
    const userRepo = dbConnection.getRepository(User);
    const profileRepo = dbConnection.getRepository(UserProfile);
    const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

    try {
      const bulkCreation = await bulkCreationRepo.findOne({
        where: { id: bulkCreationId }
      });

      if (!bulkCreation) {
        return;
      }

      const createdInstructors: Map<string, User> = new Map();
      const createdStudents: User[] = [];

      for (const instructorData of instructors) {
        try {
          const password = BulkUserCreationController.generateRandomPassword();
          const password_hash = await bcrypt.hash(password, 12);

          let instructor = await userRepo.findOne({
            where: { email: instructorData.email }
          });

          if (!instructor) {
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

            await sendInstructorCredentials(
              instructor.email,
              instructor.first_name,
              instructor.last_name,
              password,
              institutionName
            );
          }

          createdInstructors.set(instructorData.email, instructor);
          bulkCreation.processed_instructors += 1;
          await bulkCreationRepo.save(bulkCreation);

        } catch (error: any) {
        }
      }

      for (const studentData of students) {
        try {
          const password = BulkUserCreationController.generateRandomPassword();
          const password_hash = await bcrypt.hash(password, 12);

          let student = await userRepo.findOne({
            where: { email: studentData.email }
          });

          if (!student) {
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
                student: { id: student.id }
              }
            });

            if (!existingLink) {
              const link = instructorStudentRepo.create({
                instructor,
                student,
                assigned_at: new Date()
              });
              await instructorStudentRepo.save(link);
            }
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
        }
      }

      bulkCreation.status = BulkCreationStatus.COMPLETED;
      bulkCreation.completed_at = new Date();
      await bulkCreationRepo.save(bulkCreation);

    } catch (error: any) {
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