import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
  ) {}

  async getSettings() {
    let settings = await this.settingsModel.findOne({ key: 'default' });
    if (!settings) {
      // Create default settings
      settings = new this.settingsModel({
        key: 'default',
        pointsTarget: 10,
        rewardName: 'Free Coffee',
        minPurchaseAmount: 0,
      });
      await settings.save();
    }
    return settings;
  }

  async updateSettings(data: any) {
    return this.settingsModel.findOneAndUpdate(
      { key: 'default' },
      { $set: data },
      { new: true, upsert: true },
    );
  }
}
