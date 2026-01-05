"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Briefcase,
  Link as LinkIcon,
  Edit,
  Settings,
  Activity,
  BarChart3,
  MessageSquareText,
  TrendingUp,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Mock user data
const userData = {
  id: "1",
  name: "Nur Kairkhanov",
  email: "nurasyl@example.com",
  avatar: null,
  role: "User",
  company: "Tech Company",
  location: "Almaty, Kazakhstan",
  website: "https://example.com",
  joinedAt: new Date("2024-06-15"),
  bio: "Media monitoring specialist focused on brand analytics and sentiment analysis. Passionate about leveraging AI for actionable insights.",
};

// Mock activity data
const recentActivity = [
  {
    id: "1",
    type: "project_created",
    title: "Created new project",
    description: "Tech Brand Monitor",
    time: "2 hours ago",
    icon: FileText,
  },
  {
    id: "2",
    type: "report_generated",
    title: "Generated PDF report",
    description: "Weekly Summary Report",
    time: "5 hours ago",
    icon: FileText,
  },
  {
    id: "3",
    type: "mention_analyzed",
    title: "Analyzed 1,234 mentions",
    description: "AI Insights generated",
    time: "1 day ago",
    icon: MessageSquareText,
  },
  {
    id: "4",
    type: "alert_triggered",
    title: "Sentiment alert triggered",
    description: "Negative spike detected",
    time: "2 days ago",
    icon: TrendingUp,
  },
];

// Mock stats
const userStats = [
  { label: "Projects", value: 5, icon: Briefcase },
  { label: "Reports Generated", value: 47, icon: FileText },
  { label: "Mentions Analyzed", value: "12.4K", icon: MessageSquareText },
  { label: "Insights Created", value: 156, icon: TrendingUp },
];

export default function ProfilePage() {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass overflow-hidden">
          {/* Cover gradient */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
          
          <CardContent className="relative pt-0 pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-6">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={userData.avatar || undefined} />
                <AvatarFallback className="text-3xl font-bold bg-primary/10">
                  {userData.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-2 mb-8">
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button size="sm" className="glow-sm" asChild>
                <Link href="/profile/settings">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            </div>
            
            {/* User Info */}
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-2xl font-bold">{userData.name}</h1>
                  <Badge variant="secondary" className="font-medium">
                    {userData.role}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">{userData.bio}</p>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {userData.email}
                </div>
                {userData.company && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    {userData.company}
                  </div>
                )}
                {userData.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {userData.location}
                  </div>
                )}
                {userData.website && (
                  <a
                    href={userData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {userData.website.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(userData.joinedAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {userStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <div className="grid gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
              <CardDescription>
                Your latest actions and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <activity.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {activity.time}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link href="/dashboard">
                  <BarChart3 className="h-5 w-5" />
                  <span>Go to Dashboard</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link href="/profile/settings">
                  <Settings className="h-5 w-5" />
                  <span>Account Settings</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Activity className="h-5 w-5" />
                <span>Activity Log</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

