import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BlockedUsersService {
    private blockedUsers: Record<number, boolean> = {};
    private declineCount: Record<number, number> = {};

    private readonly dataDir = path.join(__dirname, '..', '..', '..', 'data');
    private readonly storagePath = path.join(this.dataDir, 'blockedUsers.json');
    private readonly DECLINE_LIMIT = 1;

    constructor() {
        this.ensureDataDirectoryExists();
        this.loadBlockedUsers();
    }

    private ensureDataDirectoryExists() {
        if (!fs.existsSync(this.dataDir)) {
            try {
                // The recursive: true option ensures the data folder is created
                fs.mkdirSync(this.dataDir, { recursive: true });
                console.log(`Created data directory at ${this.dataDir}`);
            } catch (err) {
                console.error('Failed to create data directory:', err);
            }
        }
    }

    private loadBlockedUsers() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = fs.readFileSync(this.storagePath, 'utf-8');
                const json = JSON.parse(data);
                this.blockedUsers = json.blockedUsers || {};
                this.declineCount = json.declineCount || {};
            }
        } catch (err) {
            console.error('Failed to load blocked users JSON:', err);
            this.blockedUsers = {};
            this.declineCount = {};
        }
    }

    private saveBlockedUsers() {
        try {
            this.ensureDataDirectoryExists();
            const data = {
                blockedUsers: this.blockedUsers,
                declineCount: this.declineCount,
            };
            fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (err) {
            console.error('Failed to save blocked users JSON:', err);
        }
    }

    isBlocked(userId: number): boolean {
        return !!this.blockedUsers[userId];
    }

    handleDecline(userId: number) {
        this.declineCount[userId] = (this.declineCount[userId] || 0) + 1;
        if (this.declineCount[userId] >= this.DECLINE_LIMIT) {
            this.blockedUsers[userId] = true;
        }
        this.saveBlockedUsers();
    }
}