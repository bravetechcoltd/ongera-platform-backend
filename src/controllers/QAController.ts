// @ts-nocheck

import { Request, Response } from "express";
import dbConnection from '../database/db';
import { QAThread } from "../database/models/QAThread";
import { QAAnswer } from "../database/models/QAAnswer";
import { QAVote, VoteType } from "../database/models/QAVote";
import { Community } from "../database/models/Community";
import { In } from "typeorm";

export class QAController {
  
  // ✅ Create Question
  static async createThread(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { title, content, tags, category, community_id } = req.body;

      console.log("🔍 Creating QA Thread:", { userId, title, community_id });

      // Validate
      if (!title || title.length < 10 || title.length > 200) {
        return res.status(400).json({
          success: false,
          message: "Title must be between 10-200 characters"
        });
      }

      if (!content || content.length < 20) {
        return res.status(400).json({
          success: false,
          message: "Content must be at least 20 characters"
        });
      }

      // If community specified, verify membership
      if (community_id) {
        const communityRepo = dbConnection.getRepository(Community);
        const community = await communityRepo.findOne({
          where: { id: community_id },
          relations: ["members", "creator"]
        });

        if (!community) {
          return res.status(404).json({
            success: false,
            message: "Community not found"
          });
        }

        const isMember = community.members.some(m => m.id === userId) || 
                        community.creator.id === userId;
        
        if (!isMember) {
          return res.status(403).json({
            success: false,
            message: "You must be a member to post questions"
          });
        }
      }

      const threadRepo = dbConnection.getRepository(QAThread);
      
      const thread = threadRepo.create({
        title,
        content,
        tags: tags || [],
        category,
        asker: { id: userId },
        community: community_id ? { id: community_id } : null,
      });

      await threadRepo.save(thread);
      console.log("✅ Thread created:", thread.id);

      // Fetch complete thread
      const completeThread = await threadRepo.findOne({
        where: { id: thread.id },
        relations: ["asker", "asker.profile", "community"]
      });

      res.status(201).json({
        success: true,
        message: "Question created successfully",
        data: { thread: completeThread },
      });
    } catch (error: any) {
      console.error("❌ Create thread error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create question", 
        error: error.message 
      });
    }
  }

  // ✅ Get All Threads (with filters)
  static async getAllThreads(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        category,
        tags,
        is_answered,
        community_id,
        sort = 'latest'
      } = req.query;

      console.log("🔍 Getting all threads with filters:", { 
        page, limit, search, category, is_answered, community_id, sort 
      });

      const threadRepo = dbConnection.getRepository(QAThread);
      const queryBuilder = threadRepo.createQueryBuilder("thread")
        .leftJoinAndSelect("thread.asker", "asker")
        .leftJoinAndSelect("asker.profile", "profile")
        .leftJoinAndSelect("thread.community", "community")
        .leftJoinAndSelect("thread.answers", "answers")
        .where("thread.is_active = :isActive", { isActive: true });

      // Search
      if (search) {
        queryBuilder.andWhere(
          "(thread.title ILIKE :search OR thread.content ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      // Category filter
      if (category) {
        queryBuilder.andWhere("thread.category = :category", { category });
      }

      // Tags filter
      if (tags) {
        const tagArray = (tags as string).split(',');
        queryBuilder.andWhere("thread.tags && :tags", { tags: tagArray });
      }

      // Answered filter
      if (is_answered !== undefined) {
        queryBuilder.andWhere("thread.is_answered = :is_answered", { 
          is_answered: is_answered === 'true' 
        });
      }

      // Community filter
      if (community_id) {
        queryBuilder.andWhere("thread.community_id = :community_id", { community_id });
      }

      // Sorting
      switch (sort) {
        case 'popular':
          queryBuilder.orderBy("thread.view_count", "DESC");
          break;
        case 'unanswered':
          queryBuilder.andWhere("thread.is_answered = :isAnswered", { isAnswered: false });
          queryBuilder.orderBy("thread.created_at", "DESC");
          break;
        case 'latest':
        default:
          queryBuilder.orderBy("thread.created_at", "DESC");
      }

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const [threads, total] = await queryBuilder.getManyAndCount();

      // Add answer count
      const threadsWithCount = threads.map(thread => ({
        ...thread,
        answer_count: thread.answers?.length || 0
      }));

      console.log("✅ Threads fetched:", { count: threads.length, total });

      res.json({
        success: true,
        data: {
          threads: threadsWithCount,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      console.error("❌ Get threads error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch questions", 
        error: error.message 
      });
    }
  }

  // ✅ Get Single Thread with Answers
  static async getThreadById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      console.log("🔍 Getting thread by ID:", { id, userId });

      const threadRepo = dbConnection.getRepository(QAThread);
      
      const thread = await threadRepo.findOne({
        where: { id, is_active: true },
        relations: [
          "asker",
          "asker.profile",
          "community",
          "answers",
          "answers.answerer",
          "answers.answerer.profile",
          "best_answer",
          "best_answer.answerer",
          "best_answer.answerer.profile"
        ]
      });

      if (!thread) {
        console.log("❌ Thread not found");
        return res.status(404).json({
          success: false,
          message: "Question not found"
        });
      }

      // Increment view count
      thread.view_count += 1;
      await threadRepo.save(thread);
      console.log("✅ View count incremented:", thread.view_count);

      // Get user votes if authenticated
      if (userId && thread.answers && thread.answers.length > 0) {
        const voteRepo = dbConnection.getRepository(QAVote);
        const answerIds = thread.answers.map(a => a.id);
        
        const userVotes = await voteRepo.find({
          where: {
            user: { id: userId },
            answer: { id: In(answerIds) }
          }
        });

        const voteMap = new Map(userVotes.map(v => [v.answer.id, v.vote_type]));
        
        thread.answers = thread.answers.map(answer => ({
          ...answer,
          user_vote: voteMap.get(answer.id)
        }));
      }

      // Sort answers: accepted first, then by votes
      if (thread.answers) {
        thread.answers.sort((a, b) => {
          if (a.is_accepted) return -1;
          if (b.is_accepted) return 1;
          return b.upvotes_count - a.upvotes_count;
        });
      }

      console.log("✅ Thread fetched successfully with", thread.answers?.length || 0, "answers");

      res.json({
        success: true,
        data: { thread },
      });
    } catch (error: any) {
      console.error("❌ Get thread error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch question",
        error: error.message
      });
    }
  }

  // ✅ Update Thread
  static async updateThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { title, content, tags, category } = req.body;

      console.log("🔍 Updating thread:", { id, userId });

      const threadRepo = dbConnection.getRepository(QAThread);
      const thread = await threadRepo.findOne({
        where: { id },
        relations: ["asker"]
      });

      if (!thread) {
        return res.status(404).json({
          success: false,
          message: "Question not found"
        });
      }

      if (thread.asker.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only edit your own questions"
        });
      }

      if (title) thread.title = title;
      if (content) thread.content = content;
      if (tags) thread.tags = tags;
      if (category) thread.category = category;

      await threadRepo.save(thread);
      console.log("✅ Thread updated successfully");

      res.json({
        success: true,
        message: "Question updated successfully",
        data: { thread }
      });
    } catch (error: any) {
      console.error("❌ Update thread error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update question",
        error: error.message
      });
    }
  }

  // ✅ Delete Thread
  static async deleteThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      console.log("🔍 Deleting thread:", { id, userId });

      const threadRepo = dbConnection.getRepository(QAThread);
      const thread = await threadRepo.findOne({
        where: { id },
        relations: ["asker"]
      });

      if (!thread) {
        return res.status(404).json({
          success: false,
          message: "Question not found"
        });
      }

      if (thread.asker.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own questions"
        });
      }

      thread.is_active = false;
      await threadRepo.save(thread);
      console.log("✅ Thread soft deleted successfully");

      res.json({
        success: true,
        message: "Question deleted successfully"
      });
    } catch (error: any) {
      console.error("❌ Delete thread error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete question",
        error: error.message
      });
    }
  }

  // ✅ Get My Questions
  static async getMyThreads(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20 } = req.query;

      console.log("🔍 Getting my threads:", { userId, page, limit });

      const threadRepo = dbConnection.getRepository(QAThread);
      const queryBuilder = threadRepo.createQueryBuilder("thread")
        .leftJoinAndSelect("thread.answers", "answers")
        .leftJoinAndSelect("thread.community", "community")
        .where("thread.asker_id = :userId", { userId })
        .andWhere("thread.is_active = :isActive", { isActive: true })
        .orderBy("thread.created_at", "DESC");

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const [threads, total] = await queryBuilder.getManyAndCount();

      const threadsWithCount = threads.map(thread => ({
        ...thread,
        answer_count: thread.answers?.length || 0
      }));

      console.log("✅ My threads fetched:", { count: threads.length, total });

      res.json({
        success: true,
        data: {
          threads: threadsWithCount,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      console.error("❌ Get my threads error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch your questions",
        error: error.message
      });
    }
  }

  // ✅ Create Answer
  static async createAnswer(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { thread_id } = req.params;
      const { content } = req.body;

      console.log("🔍 Creating answer:", { userId, thread_id });

      if (!content || content.length < 20) {
        return res.status(400).json({
          success: false,
          message: "Answer must be at least 20 characters"
        });
      }

      const threadRepo = dbConnection.getRepository(QAThread);
      const thread = await threadRepo.findOne({
        where: { id: thread_id, is_active: true }
      });

      if (!thread) {
        return res.status(404).json({
          success: false,
          message: "Question not found"
        });
      }

      const answerRepo = dbConnection.getRepository(QAAnswer);
      
      const answer = answerRepo.create({
        content,
        thread: { id: thread_id },
        answerer: { id: userId },
      });

      await answerRepo.save(answer);
      console.log("✅ Answer created:", answer.id);

      // Fetch complete answer
      const completeAnswer = await answerRepo.findOne({
        where: { id: answer.id },
        relations: ["answerer", "answerer.profile"]
      });

      res.status(201).json({
        success: true,
        message: "Answer posted successfully",
        data: { answer: completeAnswer },
      });
    } catch (error: any) {
      console.error("❌ Create answer error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to post answer", 
        error: error.message 
      });
    }
  }

  // ✅ Update Answer
  static async updateAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { content } = req.body;

      console.log("🔍 Updating answer:", { id, userId });

      const answerRepo = dbConnection.getRepository(QAAnswer);
      const answer = await answerRepo.findOne({
        where: { id },
        relations: ["answerer"]
      });

      if (!answer) {
        return res.status(404).json({
          success: false,
          message: "Answer not found"
        });
      }

      if (answer.answerer.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only edit your own answers"
        });
      }

      answer.content = content;
      await answerRepo.save(answer);
      console.log("✅ Answer updated successfully");

      res.json({
        success: true,
        message: "Answer updated successfully",
        data: { answer }
      });
    } catch (error: any) {
      console.error("❌ Update answer error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update answer",
        error: error.message
      });
    }
  }

  // ✅ Delete Answer
  static async deleteAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      console.log("🔍 Deleting answer:", { id, userId });

      const answerRepo = dbConnection.getRepository(QAAnswer);
      const answer = await answerRepo.findOne({
        where: { id },
        relations: ["answerer"]
      });

      if (!answer) {
        return res.status(404).json({
          success: false,
          message: "Answer not found"
        });
      }

      if (answer.answerer.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own answers"
        });
      }

      await answerRepo.remove(answer);
      console.log("✅ Answer deleted successfully");

      res.json({
        success: true,
        message: "Answer deleted successfully"
      });
    } catch (error: any) {
      console.error("❌ Delete answer error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete answer",
        error: error.message
      });
    }
  }

  // ✅ Accept Answer - FIXED CIRCULAR REFERENCE
  static async acceptAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      console.log("🔍 ========== ACCEPT ANSWER DEBUG START ==========");
      console.log("📥 Request params:", { answerId: id, userId });

      // Step 1: Find answer with thread and asker
      console.log("📍 STEP 1: Finding answer with thread relation...");
      const answerRepo = dbConnection.getRepository(QAAnswer);
      const answer = await answerRepo.findOne({
        where: { id },
        relations: ["thread", "thread.asker", "answerer", "answerer.profile"]
      });

      console.log("✅ Answer found:", {
        answerId: answer?.id,
        threadId: answer?.thread?.id,
        askerId: answer?.thread?.asker?.id,
        answererId: answer?.answerer?.id
      });

      if (!answer) {
        console.log("❌ Answer not found");
        return res.status(404).json({
          success: false,
          message: "Answer not found"
        });
      }

      // Step 2: Verify permissions
      console.log("📍 STEP 2: Verifying permissions...");
      if (answer.thread.asker.id !== userId) {
        console.log("❌ Permission denied - not the question asker");
        return res.status(403).json({
          success: false,
          message: "Only the question asker can accept answers"
        });
      }
      console.log("✅ Permission verified - user is the asker");

      // Step 3: Handle previous accepted answer
      console.log("📍 STEP 3: Checking for previous accepted answer...");
      const threadRepo = dbConnection.getRepository(QAThread);
      const thread = await threadRepo.findOne({
        where: { id: answer.thread.id },
        relations: ["best_answer"]
      });

      if (thread?.best_answer) {
        console.log("🔄 Found previous accepted answer:", thread.best_answer.id);
        const prevAnswer = await answerRepo.findOne({
          where: { id: thread.best_answer.id }
        });
        if (prevAnswer) {
          prevAnswer.is_accepted = false;
          await answerRepo.save(prevAnswer);
          console.log("✅ Previous answer unaccepted");
        }
      } else {
        console.log("ℹ️ No previous accepted answer");
      }

      // Step 4: Accept the new answer
      console.log("📍 STEP 4: Accepting new answer...");
      answer.is_accepted = true;
      await answerRepo.save(answer);
      console.log("✅ Answer marked as accepted");

      // Step 5: Update thread
      console.log("📍 STEP 5: Updating thread with best answer...");
      if (thread) {
        thread.best_answer = { id: answer.id } as QAAnswer; // Only set the ID to avoid circular ref
        thread.is_answered = true;
        await threadRepo.save(thread);
        console.log("✅ Thread updated with best answer");
      }

      // Step 6: Fetch clean answer data WITHOUT thread.best_answer circular reference
      console.log("📍 STEP 6: Fetching clean answer data...");
      const cleanAnswer = await answerRepo.findOne({
        where: { id: answer.id },
        relations: ["answerer", "answerer.profile"]
      });

      console.log("✅ Clean answer fetched:", {
        id: cleanAnswer?.id,
        is_accepted: cleanAnswer?.is_accepted,
        hasAnswerer: !!cleanAnswer?.answerer
      });

      console.log("🔍 ========== ACCEPT ANSWER DEBUG END ==========\n");

      // Return clean answer without circular references
      res.json({
        success: true,
        message: "Answer accepted successfully",
        data: { 
          answer: {
            id: cleanAnswer!.id,
            content: cleanAnswer!.content,
            is_accepted: cleanAnswer!.is_accepted,
            upvotes_count: cleanAnswer!.upvotes_count,
            created_at: cleanAnswer!.created_at,
            updated_at: cleanAnswer!.updated_at,
            answerer: cleanAnswer!.answerer
          }
        }
      });
    } catch (error: any) {
      console.error("❌ ========== ACCEPT ANSWER ERROR ==========");
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      console.error("==========================================\n");

      res.status(500).json({
        success: false,
        message: "Failed to accept answer",
        error: error.message
      });
    }
  }

  // ✅ Vote Answer
  static async voteAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { vote_type } = req.body;

      console.log("🔍 Voting on answer:", { answerId: id, userId, vote_type });

      if (!Object.values(VoteType).includes(vote_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vote type"
        });
      }

      const answerRepo = dbConnection.getRepository(QAAnswer);
      const answer = await answerRepo.findOne({
        where: { id },
        relations: ["answerer"]
      });

      if (!answer) {
        return res.status(404).json({
          success: false,
          message: "Answer not found"
        });
      }

      // Cannot vote own answer
      if (answer.answerer.id === userId) {
        return res.status(403).json({
          success: false,
          message: "You cannot vote on your own answer"
        });
      }

      const voteRepo = dbConnection.getRepository(QAVote);
      
      // Check existing vote
      const existingVote = await voteRepo.findOne({
        where: {
          user: { id: userId },
          answer: { id }
        }
      });

      if (existingVote) {
        console.log("🔄 Updating existing vote");
        const oldVote = existingVote.vote_type;
        existingVote.vote_type = vote_type;
        await voteRepo.save(existingVote);

        if (oldVote === VoteType.UPVOTE && vote_type === VoteType.DOWNVOTE) {
          answer.upvotes_count -= 1;
        } else if (oldVote === VoteType.DOWNVOTE && vote_type === VoteType.UPVOTE) {
          answer.upvotes_count += 1;
        }
      } else {
        console.log("➕ Creating new vote");
        const vote = voteRepo.create({
          user: { id: userId },
          answer: { id },
          vote_type
        });
        await voteRepo.save(vote);

        if (vote_type === VoteType.UPVOTE) {
          answer.upvotes_count += 1;
        }
      }

      await answerRepo.save(answer);
      console.log("✅ Vote recorded successfully");

      res.json({
        success: true,
        message: "Vote recorded successfully",
        data: { answer }
      });
    } catch (error: any) {
      console.error("❌ Vote answer error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to vote",
        error: error.message
      });
    }
  }

  // ✅ Remove Vote
  static async removeVote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      console.log("🔍 Removing vote:", { answerId: id, userId });

      const voteRepo = dbConnection.getRepository(QAVote);
      const vote = await voteRepo.findOne({
        where: {
          user: { id: userId },
          answer: { id }
        },
        relations: ["answer"]
      });

      if (!vote) {
        return res.status(404).json({
          success: false,
          message: "Vote not found"
        });
      }

      const answerRepo = dbConnection.getRepository(QAAnswer);
      const answer = await answerRepo.findOne({ where: { id } });

      if (answer && vote.vote_type === VoteType.UPVOTE) {
        answer.upvotes_count = Math.max(0, answer.upvotes_count - 1);
        await answerRepo.save(answer);
      }

      await voteRepo.remove(vote);
      console.log("✅ Vote removed successfully");

      res.json({
        success: true,
        message: "Vote removed successfully"
      });
    } catch (error: any) {
      console.error("❌ Remove vote error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove vote",
        error: error.message
      });
    }
  }
}