// @ts-nocheck

import { Request, Response } from "express";
import dbConnection from '../database/db';
import { QAThread } from "../database/models/QAThread";
import { QAAnswer } from "../database/models/QAAnswer";
import { QAVote, VoteType } from "../database/models/QAVote";
import { Community } from "../database/models/Community";
import { In } from "typeorm";

export class QAController {
  
  static async createThread(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { title, content, tags, category, community_id } = req.body;

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
      res.status(500).json({ 
        success: false, 
        message: "Failed to create question", 
        error: error.message 
      });
    }
  }

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

      const threadRepo = dbConnection.getRepository(QAThread);
      const queryBuilder = threadRepo.createQueryBuilder("thread")
        .leftJoinAndSelect("thread.asker", "asker")
        .leftJoinAndSelect("asker.profile", "profile")
        .leftJoinAndSelect("thread.community", "community")
        .leftJoinAndSelect("thread.answers", "answers")
        .where("thread.is_active = :isActive", { isActive: true });

      if (search) {
        queryBuilder.andWhere(
          "(thread.title ILIKE :search OR thread.content ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      if (category) {
        queryBuilder.andWhere("thread.category = :category", { category });
      }

      if (tags) {
        const tagArray = (tags as string).split(',');
        queryBuilder.andWhere("thread.tags && :tags", { tags: tagArray });
      }

      if (is_answered !== undefined) {
        queryBuilder.andWhere("thread.is_answered = :is_answered", { 
          is_answered: is_answered === 'true' 
        });
      }

      if (community_id) {
        queryBuilder.andWhere("thread.community_id = :community_id", { community_id });
      }

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

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const [threads, total] = await queryBuilder.getManyAndCount();

      const threadsWithCount = threads.map(thread => ({
        ...thread,
        answer_count: thread.answers?.length || 0
      }));

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
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch questions", 
        error: error.message 
      });
    }
  }

  static async getThreadById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

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
        return res.status(404).json({
          success: false,
          message: "Question not found"
        });
      }

      thread.view_count += 1;
      await threadRepo.save(thread);

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

      if (thread.answers) {
        thread.answers.sort((a, b) => {
          if (a.is_accepted) return -1;
          if (b.is_accepted) return 1;
          return b.upvotes_count - a.upvotes_count;
        });
      }

      res.json({
        success: true,
        data: { thread },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch question",
        error: error.message
      });
    }
  }

  static async updateThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { title, content, tags, category } = req.body;

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

      res.json({
        success: true,
        message: "Question updated successfully",
        data: { thread }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to update question",
        error: error.message
      });
    }
  }

  static async deleteThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

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

      thread.is_active = false;
      await threadRepo.save(thread);

      res.json({
        success: true,
        message: "Question deleted successfully"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to delete question",
        error: error.message
      });
    }
  }

  static async getMyThreads(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20 } = req.query;

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
      res.status(500).json({
        success: false,
        message: "Failed to fetch your questions",
        error: error.message
      });
    }
  }

  static async createAnswer(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { thread_id } = req.params;
      const { content } = req.body;

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
      res.status(500).json({ 
        success: false, 
        message: "Failed to post answer", 
        error: error.message 
      });
    }
  }

  static async updateAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { content } = req.body;

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

      res.json({
        success: true,
        message: "Answer updated successfully",
        data: { answer }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to update answer",
        error: error.message
      });
    }
  }

  static async deleteAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

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

      res.json({
        success: true,
        message: "Answer deleted successfully"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to delete answer",
        error: error.message
      });
    }
  }

  static async acceptAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const answerRepo = dbConnection.getRepository(QAAnswer);
      const answer = await answerRepo.findOne({
        where: { id },
        relations: ["thread", "thread.asker", "answerer", "answerer.profile"]
      });

      if (!answer) {
        return res.status(404).json({
          success: false,
          message: "Answer not found"
        });
      }

      if (answer.thread.asker.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Only the question asker can accept answers"
        });
      }

      const threadRepo = dbConnection.getRepository(QAThread);
      const thread = await threadRepo.findOne({
        where: { id: answer.thread.id },
        relations: ["best_answer"]
      });

      if (thread?.best_answer) {
        const prevAnswer = await answerRepo.findOne({
          where: { id: thread.best_answer.id }
        });
        if (prevAnswer) {
          prevAnswer.is_accepted = false;
          await answerRepo.save(prevAnswer);
        }
      }

      answer.is_accepted = true;
      await answerRepo.save(answer);

      if (thread) {
        thread.best_answer = { id: answer.id } as QAAnswer;
        thread.is_answered = true;
        await threadRepo.save(thread);
      }

      const cleanAnswer = await answerRepo.findOne({
        where: { id: answer.id },
        relations: ["answerer", "answerer.profile"]
      });

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
      res.status(500).json({
        success: false,
        message: "Failed to accept answer",
        error: error.message
      });
    }
  }

  static async voteAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { vote_type } = req.body;

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

      if (answer.answerer.id === userId) {
        return res.status(403).json({
          success: false,
          message: "You cannot vote on your own answer"
        });
      }

      const voteRepo = dbConnection.getRepository(QAVote);
      
      const existingVote = await voteRepo.findOne({
        where: {
          user: { id: userId },
          answer: { id }
        }
      });

      if (existingVote) {
        const oldVote = existingVote.vote_type;
        existingVote.vote_type = vote_type;
        await voteRepo.save(existingVote);

        if (oldVote === VoteType.UPVOTE && vote_type === VoteType.DOWNVOTE) {
          answer.upvotes_count -= 1;
        } else if (oldVote === VoteType.DOWNVOTE && vote_type === VoteType.UPVOTE) {
          answer.upvotes_count += 1;
        }
      } else {
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

      res.json({
        success: true,
        message: "Vote recorded successfully",
        data: { answer }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to vote",
        error: error.message
      });
    }
  }

  static async removeVote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

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

      res.json({
        success: true,
        message: "Vote removed successfully"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to remove vote",
        error: error.message
      });
    }
  }
}