import { Request, Response } from 'express';
import { AboutContent } from '../models/AboutContent.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function getAboutContent(req: Request, res: Response): Promise<void> {
  try {
    let about = await AboutContent.findOne();
    if (!about) {
      about = await AboutContent.create({
        title: 'من نحن - كلينزو لخدمات العناية المتنقلة',
        titleEn: 'About Cleanzo - Mobile Car & Home Detailing',
        description: 'رواد خدمات العناية المتنقلة بأعلى معايير الجودة والاحترافية والتعقيم بالبخار في مصر.',
        descriptionEn: 'Pioneers of mobile steam car wash and home detailing in Egypt.',
        mission: 'تقديم تجربة عناية فائقة عند باب منزلك بأحدث الأجهزة وتقنيات البخار الإيطالية.',
        missionEn: 'Delivering premium door-to-door cleaning experiences using advanced steam technology.',
        vision: 'أن نكون الخيار الأول والموثوق للعناية بالسيارات والمنازل في كافة محافظات مصر.',
        visionEn: 'To be Egypt’s most trusted premier car and home mobile care provider.',
        stats: [
          { id: '1', label: 'عميل سعيد', labelEn: 'Happy Clients', value: '+15,000' },
          { id: '2', label: 'خدمة منفذة', labelEn: 'Completed Services', value: '+24,000' },
          { id: '3', label: 'فني محترف', labelEn: 'Certified Techs', value: '+45' },
          { id: '4', label: 'تقييم العملاء', labelEn: 'Customer Rating', value: '4.9/5' },
        ],
      });
    }
    sendSuccess(res, about);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateAboutContent(req: Request, res: Response): Promise<void> {
  try {
    let about = await AboutContent.findOne();
    if (!about) {
      about = await AboutContent.create(req.body);
    } else {
      Object.assign(about, req.body);
      await about.save();
    }
    sendSuccess(res, about, 'تم تحديث محتوى (من نحن) بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
