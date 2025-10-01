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
  console.log("\n📊 ========== PARSE EXCEL FILE START ==========");
  
  try {
    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({
        success: false,
        message: "Excel file is required"
      });
    }

    console.log("📁 File received:", {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Parse the Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    console.log("📋 Available sheets:", workbook.SheetNames);

    // Try to find sheets with case-insensitive matching
    let instructorSheet: XLSX.WorkSheet | null = null;
    let studentSheet: XLSX.WorkSheet | null = null;
    
    let instructorSheetName = '';
    let studentSheetName = '';

    // Find instructor sheet (case-insensitive)
    for (const sheetName of workbook.SheetNames) {
      const lowerName = sheetName.toLowerCase().trim();
      if (lowerName === 'instructors' || lowerName === 'instructor') {
        instructorSheet = workbook.Sheets[sheetName];
        instructorSheetName = sheetName;
        console.log(`✅ Found instructor sheet: "${sheetName}"`);
        break;
      }
    }

    // Find student sheet (case-insensitive)
    for (const sheetName of workbook.SheetNames) {
      const lowerName = sheetName.toLowerCase().trim();
      if (lowerName === 'students' || lowerName === 'student') {
        studentSheet = workbook.Sheets[sheetName];
        studentSheetName = sheetName;
        console.log(`✅ Found student sheet: "${sheetName}"`);
        break;
      }
    }

    if (!instructorSheet || !studentSheet) {
      console.log("❌ Missing required sheets");
      return res.status(400).json({
        success: false,
        message: `Excel file must contain both 'Instructors' and 'Students' sheets. Found: ${workbook.SheetNames.join(', ')}`,
        availableSheets: workbook.SheetNames
      });
    }

    // Parse sheets to JSON
    const instructorsRaw = XLSX.utils.sheet_to_json(instructorSheet);
    const studentsRaw = XLSX.utils.sheet_to_json(studentSheet);

    console.log("📊 Raw data parsed:", {
      instructors: instructorsRaw.length,
      students: studentsRaw.length
    });

    // Log sample data for debugging
    if (instructorsRaw.length > 0) {
      console.log("📋 Sample instructor:", instructorsRaw[0]);
    }
    if (studentsRaw.length > 0) {
      console.log("📋 Sample student:", studentsRaw[0]);
    }

    // Normalize data - handle different column name formats
    const instructors = instructorsRaw.map((row: any) => {
      // Handle different possible column names
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

    console.log("✅ Normalized data:", {
      instructors: instructors.length,
      students: students.length
    });

    // Validation
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

    // Validate instructor emails exist for students
    const instructorEmails = new Set(instructors.map(i => i.email.toLowerCase()));
    const invalidStudents = students.filter(
      s => !instructorEmails.has(s.assigned_instructor_email.toLowerCase())
    );

    if (invalidStudents.length > 0) {
      console.log("⚠️ Warning: Some students have invalid instructor emails:", 
        invalidStudents.map(s => s.assigned_instructor_email)
      );
    }

    console.log("📊 ========== PARSE EXCEL FILE SUCCESS ==========\n");

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
    console.error("❌ Parse Excel error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to parse Excel file",
      error: error.message,
      details: "Please ensure the file is a valid Excel file (.xlsx or .xls) with proper sheet names."
    });
  }
}
  
  // Generate random password
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
  console.log("\n📥 ========== DOWNLOAD TEMPLATE ==========");
  
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create Instructors sheet with sample data
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

    // Create Students sheet with sample data
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

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=bulk_users_template.xlsx');
    res.setHeader('Content-Length', buffer.length);

    console.log("✅ Template generated successfully");
    console.log("📊 ========== DOWNLOAD TEMPLATE SUCCESS ==========\n");

    res.send(buffer);

  } catch (error: any) {
    console.error("❌ Template generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message
    });
  }
}

  // Create bulk users (instructors + students)
  static async createBulkUsers(req: Request, res: Response) {
    console.log("\n🚀 ========== BULK USER CREATION START ==========");
    
    try {
      const creatorId = req.user.userId;
      const { instructors, students } = req.body;

      console.log("📥 Request Data:", {
        creatorId,
        instructorCount: instructors?.length,
        studentCount: students?.length
      });

      // Validation
      if (!instructors || !Array.isArray(instructors) || instructors.length === 0) {
        console.log("❌ No instructors provided");
        return res.status(400).json({
          success: false,
          message: "At least one instructor is required"
        });
      }

      if (!students || !Array.isArray(students) || students.length === 0) {
        console.log("❌ No students provided");
        return res.status(400).json({
          success: false,
          message: "At least one student is required"
        });
      }

      // Get creator (must be Institution)
      const userRepo = dbConnection.getRepository(User);
      const creator = await userRepo.findOne({
        where: { id: creatorId },
        relations: ["profile"]
      });

      if (!creator) {
        console.log("❌ Creator not found");
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (creator.account_type !== AccountType.INSTITUTION) {
        console.log("❌ Not an institution account");
        return res.status(403).json({
          success: false,
          message: "Only institutions can create bulk users"
        });
      }

      const institutionName = creator.profile?.institution_name || creator.first_name;
      console.log("✅ Creator verified:", {
        name: institutionName,
        type: creator.account_type
      });

      // Create bulk creation record
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
      console.log("✅ Bulk creation record created:", bulkCreation.id);

      // Process in background (use async without await)
      BulkUserCreationController.processBulkCreation(
        bulkCreation.id,
        instructors,
        students,
        institutionName
      ).catch(err => {
        console.error("❌ Background processing error:", err);
      });

      console.log("🚀 ========== BULK USER CREATION INITIATED ==========\n");

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
      console.error("❌ Bulk user creation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start bulk user creation",
        error: error.message
      });
    }
  }

  // Background processing function
  static async processBulkCreation(
    bulkCreationId: string,
    instructors: any[],
    students: any[],
    institutionName: string
  ) {
    console.log("\n📊 ========== PROCESSING BULK CREATION ==========");
    console.log("Bulk Creation ID:", bulkCreationId);
    
    const bulkCreationRepo = dbConnection.getRepository(BulkUserCreation);
    const userRepo = dbConnection.getRepository(User);
    const profileRepo = dbConnection.getRepository(UserProfile);
    const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

    try {
      const bulkCreation = await bulkCreationRepo.findOne({
        where: { id: bulkCreationId }
      });

      if (!bulkCreation) {
        console.error("❌ Bulk creation record not found");
        return;
      }

      const createdInstructors: Map<string, User> = new Map();
      const createdStudents: User[] = [];

      // Step 1: Create Instructors
      console.log("\n👨‍🏫 Creating Instructors...");
      for (const instructorData of instructors) {
        try {
          const password = BulkUserCreationController.generateRandomPassword();
          const password_hash = await bcrypt.hash(password, 12);

          console.log(`Processing instructor: ${instructorData.email}`);

          // Check if user exists
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

            // Create profile
            const profile = profileRepo.create({
              user: instructor,
              department: instructorData.department,
              institution_name: institutionName
            });
            await profileRepo.save(profile);

            // Send credentials email
            await sendInstructorCredentials(
              instructor.email,
              instructor.first_name,
              instructor.last_name,
              password,
              institutionName
            );

            console.log(`✅ Instructor created: ${instructor.email}`);
          } else {
            console.log(`⚠️ Instructor already exists: ${instructor.email}`);
          }

          createdInstructors.set(instructorData.email, instructor);
          bulkCreation.processed_instructors += 1;
          await bulkCreationRepo.save(bulkCreation);

        } catch (error: any) {
          console.error(`❌ Failed to create instructor ${instructorData.email}:`, error.message);
        }
      }

      // Step 2: Create Students
      console.log("\n🎓 Creating Students...");
      for (const studentData of students) {
        try {
          const password = BulkUserCreationController.generateRandomPassword();
          const password_hash = await bcrypt.hash(password, 12);

          console.log(`Processing student: ${studentData.email}`);

          // Check if user exists
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

            // Create profile
            const profile = profileRepo.create({
              user: student,
              institution_name: institutionName
            });
            await profileRepo.save(profile);

            console.log(`✅ Student created: ${student.email}`);
          } else {
            console.log(`⚠️ Student already exists: ${student.email}`);
          }

          // Link to instructor
          const instructor = createdInstructors.get(studentData.assigned_instructor_email);
          if (instructor) {
            // Check if link already exists
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
              console.log(`✅ Student linked to instructor: ${student.email} -> ${instructor.email}`);
            } else {
              console.log(`⚠️ Link already exists: ${student.email} -> ${instructor.email}`);
            }

            // Send credentials email
            await sendStudentCredentials(
              student.email,
              student.first_name,
              student.last_name,
              password,
              `${instructor.first_name} ${instructor.last_name}`,
              institutionName
            );
          } else {
            console.log(`⚠️ Instructor not found for student: ${studentData.assigned_instructor_email}`);
          }

          createdStudents.push(student);
          bulkCreation.processed_students += 1;
          await bulkCreationRepo.save(bulkCreation);

        } catch (error: any) {
          console.error(`❌ Failed to create student ${studentData.email}:`, error.message);
        }
      }

      // Mark as completed
      bulkCreation.status = BulkCreationStatus.COMPLETED;
      bulkCreation.completed_at = new Date();
      await bulkCreationRepo.save(bulkCreation);

      console.log("\n✅ ========== BULK CREATION COMPLETED ==========");
      console.log(`Instructors: ${bulkCreation.processed_instructors}/${bulkCreation.total_instructors}`);
      console.log(`Students: ${bulkCreation.processed_students}/${bulkCreation.total_students}`);

    } catch (error: any) {
      console.error("❌ Bulk creation processing error:", error);
      
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

  // Get bulk creation status
  static async getBulkCreationStatus(req: Request, res: Response) {
    console.log("\n📊 ========== GET BULK CREATION STATUS ==========");
    
    try {
      const { id } = req.params;
      console.log("Checking status for:", id);

      const bulkCreationRepo = dbConnection.getRepository(BulkUserCreation);
      const bulkCreation = await bulkCreationRepo.findOne({
        where: { id },
        relations: ["creator"]
      });

      if (!bulkCreation) {
        console.log("❌ Bulk creation not found");
        return res.status(404).json({
          success: false,
          message: "Bulk creation not found"
        });
      }

      console.log("✅ Status:", bulkCreation.status);
      console.log("Progress:", {
        instructors: `${bulkCreation.processed_instructors}/${bulkCreation.total_instructors}`,
        students: `${bulkCreation.processed_students}/${bulkCreation.total_students}`
      });

      res.json({
        success: true,
        data: bulkCreation
      });

    } catch (error: any) {
      console.error("❌ Get status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bulk creation status",
        error: error.message
      });
    }
  }

  // Get instructor's students
  static async getInstructorStudents(req: Request, res: Response) {
    console.log("\n👨‍🏫 ========== GET INSTRUCTOR STUDENTS ==========");
    
    try {
      const instructorId = req.user.userId;
      console.log("Instructor ID:", instructorId);

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const links = await instructorStudentRepo.find({
        where: { instructor: { id: instructorId } },
        relations: ["student", "student.profile"]
      });

      console.log(`✅ Found ${links.length} students`);

      res.json({
        success: true,
        data: {
          students: links.map(link => link.student),
          totalStudents: links.length
        }
      });

    } catch (error: any) {
      console.error("❌ Get students error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get instructor students",
        error: error.message
      });
    }
  }
}