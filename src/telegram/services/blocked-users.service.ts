// src/telegram/services/blocked-users.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BlockedUsersService {
    private blockedUsers: Record<number, boolean> = {};
    private declineCount: Record<number, number> = {};
    private readonly storagePath = path.join(__dirname, '..', '..', '..', 'data', 'blockedUsers.json');
    private readonly DECLINE_LIMIT = 3;

    constructor() {
        this.loadBlockedUsers();
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