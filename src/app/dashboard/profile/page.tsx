'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Lock,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Target,
  Eye,
  EyeOff,
  GraduationCap,
  FolderGit2,
  BookOpen,
  Award,
  Plus,
  Trash2,
  ExternalLink,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useUserProfile } from '@/components/user/UserContext';
import { ThemeSelector } from '@/components/theme/ThemeSelector';

interface StudentProjectItem {
  id: string;
  title: string;
  description: string;
  role?: string;
  techStack: string[];
  repoUrl?: string;
  liveUrl?: string;
}

export default function UserProfilePage() {
  const { user, refreshUser } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'student' | 'account'>('student');

  // Account / User profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  // Student Profile state
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [graduationYear, setGraduationYear] = useState<number>(new Date().getFullYear() + 1);
  const [graduationMonth, setGraduationMonth] = useState('May');
  const [currentSemester, setCurrentSemester] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [studentType, setStudentType] = useState<'college_student' | 'recent_graduate' | 'fresher'>('college_student');
  const [targetRole, setTargetRole] = useState('Graduate Software Engineer (SDE-1)');
  const [targetWorkType, setTargetWorkType] = useState<'internship' | 'full_time' | 'both'>('both');
  const [preferredLocationsStr, setPreferredLocationsStr] = useState('Bangalore, Remote');
  const [courseworkStr, setCourseworkStr] = useState('Data Structures & Algorithms, DBMS, Operating Systems, Computer Networks');
  const [achievementsStr, setAchievementsStr] = useState('');
  const [projects, setProjects] = useState<StudentProjectItem[]>([]);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [studentSuccess, setStudentSuccess] = useState<string | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Load existing student profile
  useEffect(() => {
    async function loadStudentData() {
      try {
        const res = await fetch('/api/student/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setInstitution(data.profile.institution || '');
            setDegree(data.profile.degree || '');
            setFieldOfStudy(data.profile.fieldOfStudy || '');
            setGraduationYear(Number(data.profile.graduationYear) || new Date().getFullYear() + 1);
            setGraduationMonth(data.profile.graduationMonth || 'May');
            setCurrentSemester(data.profile.currentSemester || '');
            setCgpa(data.profile.cgpa || '');
            setStudentType(data.profile.studentType || 'college_student');
            setTargetRole(data.profile.targetRole || 'Graduate Software Engineer (SDE-1)');
            setTargetWorkType(data.profile.targetWorkType || 'both');
            setPreferredLocationsStr((data.profile.preferredLocations || []).join(', '));
            setCourseworkStr((data.profile.coursework || []).join(', '));
            setAchievementsStr((data.profile.achievements || []).join(', '));
            setProjects(data.profile.projects || []);
          }
        }
      } catch (err) {
        console.error('Failed to load student profile:', err);
      } finally {
        setIsLoadingStudent(false);
      }
    }
    loadStudentData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setProfileError('Please enter a valid full name with at least 2 characters.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: email.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.message || 'Failed to update profile.');
        setIsSavingProfile(false);
        return;
      }

      setProfileSuccess('Profile information updated successfully.');
      await refreshUser();
    } catch {
      setProfileError('Connection error. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPass(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPassError(data.message || 'Failed to change password.');
        setIsChangingPass(false);
        return;
      }

      setPassSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPassError('Connection error. Please try again.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSaveStudentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    setStudentSuccess(null);

    if (!institution.trim()) {
      setStudentError('Please enter your College or University name.');
      return;
    }
    if (!degree.trim()) {
      setStudentError('Please enter your Degree or Program.');
      return;
    }
    if (!fieldOfStudy.trim()) {
      setStudentError('Please enter your Field of Study / Major.');
      return;
    }

    setIsSavingStudent(true);
    try {
      const payload = {
        institution: institution.trim(),
        degree: degree.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        graduationYear: Number(graduationYear),
        graduationMonth: graduationMonth.trim() || null,
        currentSemester: currentSemester.trim() || null,
        cgpa: cgpa.trim() || null,
        studentType,
        targetRole: targetRole.trim() || 'Graduate Software Engineer (SDE-1)',
        targetWorkType,
        preferredLocations: preferredLocationsStr.split(',').map((s) => s.trim()).filter(Boolean),
        coursework: courseworkStr.split(',').map((s) => s.trim()).filter(Boolean),
        achievements: achievementsStr.split(',').map((s) => s.trim()).filter(Boolean),
        projects,
      };

      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setStudentError(data.message || 'Failed to update student profile.');
        setIsSavingStudent(false);
        return;
      }

      setStudentSuccess('Student career profile saved! Career readiness and job matching models have been updated.');
    } catch {
      setStudentError('Connection error. Please try again.');
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleAddProject = () => {
    setProjects((prev) => [
      ...prev,
      {
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: '',
        description: '',
        techStack: [],
        repoUrl: '',
        liveUrl: '',
      },
    ]);
  };

  const handleRemoveProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateProject = (id: string, field: keyof StudentProjectItem, value: any) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl text-left pb-16">
      {/* Header Banner */}
      <div className="bento-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Career Center</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Student Profile & Career Goals
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Configure your college academic standing, projects, and target role to power AI career readiness.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'student'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Career Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'account'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account & Security</span>
          </button>
        </div>
      </div>

      {activeTab === 'student' ? (
        /* TAB 1: STUDENT CAREER PROFILE */
        <form onSubmit={handleSaveStudentProfile} className="space-y-6">
          {studentSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{studentSuccess}</span>
            </div>
          )}

          {studentError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{studentError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Academic Standing */}
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
                  <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    1. Academic Education & University Standing
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      College / University Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. State Institute of Technology or University of California"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Degree / Program *
                    </label>
                    <input
                      type="text"
                      required
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      placeholder="e.g. B.Tech, B.S., M.S., BCA"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Major / Field of Study *
                    </label>
                    <input
                      type="text"
                      required
                      value={fieldOfStudy}
                      onChange={(e) => setFieldOfStudy(e.target.value)}
                      placeholder="e.g. Computer Science, AI & ML, IT"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Expected Graduation Year *
                    </label>
                    <select
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      {[2023, 2024, 2025, 2026, 2027, 2028, 2029].map((y) => (
                        <option key={y} value={y}>
                          Class of {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Current Semester / Standing
                    </label>
                    <input
                      type="text"
                      value={currentSemester}
                      onChange={(e) => setCurrentSemester(e.target.value)}
                      placeholder="e.g. 6th Semester or Final Year"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      CGPA / Percentage (Optional)
                    </label>
                    <input
                      type="text"
                      value={cgpa}
                      onChange={(e) => setCgpa(e.target.value)}
                      placeholder="e.g. 3.8 / 4.0 or 8.6 CGPA"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Candidate Type
                    </label>
                    <select
                      value={studentType}
                      onChange={(e) => setStudentType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="college_student">Enrolled College Student</option>
                      <option value="recent_graduate">Recent Graduate (Class of 2024/2025)</option>
                      <option value="fresher">Fresher (Looking for 1st Role)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Career Targets */}
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
                  <Briefcase className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    2. Target Role & Opportunity Preferences
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Target Role Specification *
                    </label>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="Graduate Software Engineer (SDE-1)">Graduate Software Engineer (SDE-1)</option>
                      <option value="Junior Full Stack Developer">Junior Full Stack Developer</option>
                      <option value="Junior Frontend Developer">Junior Frontend Developer</option>
                      <option value="Junior Backend Developer">Junior Backend Developer</option>
                      <option value="Junior Data Analyst">Junior Data Analyst</option>
                      <option value="Cloud & DevOps Intern">Cloud & DevOps Intern</option>
                      <option value="AI / Machine Learning Engineer">AI / Machine Learning Trainee</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Opportunity Type
                    </label>
                    <select
                      value={targetWorkType}
                      onChange={(e) => setTargetWorkType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="both">Both (Internships & Full-Time Fresher)</option>
                      <option value="internship">Internships Only</option>
                      <option value="full_time">Full-Time Fresher Roles Only</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Preferred Work Locations (comma separated)
                    </label>
                    <input
                      type="text"
                      value={preferredLocationsStr}
                      onChange={(e) => setPreferredLocationsStr(e.target.value)}
                      placeholder="e.g. Bangalore, Hyderabad, Pune, Remote"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Academic & Capstone Projects */}
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-[var(--accent)]" />
                    <div>
                      <h2 className="text-sm font-bold text-[var(--text-primary)]">
                        3. Capstone & Personal Projects
                      </h2>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Real project code and live demos power your practical competency score.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="btn-secondary btn-sm flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Project</span>
                  </button>
                </div>

                {projects.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-color)] text-xs space-y-2">
                    <p className="text-[var(--text-secondary)]">
                      No projects added yet. Freshers with 2+ documented projects score 35% higher in AI career readiness.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddProject}
                      className="btn-primary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Project</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((proj, idx) => (
                      <div
                        key={proj.id}
                        className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3 relative text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--text-primary)]">
                            Project #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(proj.id)}
                            className="text-red-500 hover:text-red-600 transition-colors p-1 rounded cursor-pointer"
                            title="Remove project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                              Project Title *
                            </label>
                            <input
                              type="text"
                              required
                              value={proj.title}
                              onChange={(e) => handleUpdateProject(proj.id, 'title', e.target.value)}
                              placeholder="e.g. Distributed Task Orchestrator or Smart Healthcare Portal"
                              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                              Technical Description & Problem Solved *
                            </label>
                            <textarea
                              rows={2}
                              required
                              value={proj.description}
                              onChange={(e) => handleUpdateProject(proj.id, 'description', e.target.value)}
                              placeholder="Describe the architecture, problem solved, and key technical achievements..."
                              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                              Technologies Used (comma separated)
                            </label>
                            <input
                              type="text"
                              value={proj.techStack.join(', ')}
                              onChange={(e) =>
                                handleUpdateProject(
                                  proj.id,
                                  'techStack',
                                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                )
                              }
                              placeholder="e.g. React, Node.js, PostgreSQL, Docker"
                              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                              GitHub Repository URL
                            </label>
                            <input
                              type="url"
                              value={proj.repoUrl || ''}
                              onChange={(e) => handleUpdateProject(proj.id, 'repoUrl', e.target.value)}
                              placeholder="https://github.com/your-username/repo"
                              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Coursework & Academic Honors */}
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
                  <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    4. Relevant Coursework & Academic Honors
                  </h2>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Core Computer Science / Engineering Coursework (comma separated)
                    </label>
                    <input
                      type="text"
                      value={courseworkStr}
                      onChange={(e) => setCourseworkStr(e.target.value)}
                      placeholder="e.g. Data Structures & Algorithms, DBMS, Operating Systems, Computer Networks"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Academic Honors, Hackathons & Awards (comma separated)
                    </label>
                    <input
                      type="text"
                      value={achievementsStr}
                      onChange={(e) => setAchievementsStr(e.target.value)}
                      placeholder="e.g. Hackathon Finalist 2025, Dean's Honor Roll, ACM Student Chapter Lead"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingStudent}
                  className="btn-primary btn-md flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSavingStudent ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Student Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Student Career Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: AI Ecosystem Quick Links & Summary */}
            <div className="space-y-6">
              <div className="bento-card p-6 space-y-4 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                  <Target className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="font-bold text-[var(--text-primary)]">Career Intelligence</h3>
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Your academic profile directly calibrates our 4-quadrant readiness engine:
                </p>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Technical Skills</strong> verified via proctored assessments.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Project Evidence</strong> evaluated from GitHub & demo links.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong>ATS Resume</strong> scored for entry-level hiring criteria.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Mock Interviews</strong> targeted to {targetRole}.</span>
                  </li>
                </ul>

                <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
                  <Link
                    href="/guidance"
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--accent)]/10 text-[var(--text-primary)] hover:text-[var(--accent)] transition-all font-semibold"
                  >
                    <span>View Career Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/jobs"
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--accent)]/10 text-[var(--text-primary)] hover:text-[var(--accent)] transition-all font-semibold"
                  >
                    <span>Browse Fresher & Internship Jobs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* TAB 2: ACCOUNT & SECURITY SETTINGS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Account Overview Card */}
          <div className="bento-card p-6 space-y-6 h-fit">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] text-white font-bold text-xl flex items-center justify-center mx-auto shadow-md shadow-[var(--accent)]/20">
                {name ? name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                  {name || 'Candidate User'}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {email || 'No email provided'}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Student / Fresher Account</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] space-y-3 text-xs">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Account Created</span>
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Session Status</span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Active Now
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)]">
              <ThemeSelector />
            </div>
          </div>

          {/* Right 2 Columns: Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info Form */}
            <div className="bento-card p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
                <User className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Personal Details</h2>
              </div>

              {profileSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      id="profileName"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      id="profileEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.rivera@university.edu"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn-primary btn-sm flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Personal Info</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bento-card p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
                <Lock className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Security & Password</h2>
              </div>

              {passSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              {passError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      id="toggle-current-password"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowCurrentPassword((prev) => !prev);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] rounded z-10"
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        type="button"
                        id="toggle-new-password"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowNewPassword((prev) => !prev);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] rounded z-10"
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        id="confirmNewPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        type="button"
                        id="toggle-confirm-new-password"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowConfirmPassword((prev) => !prev);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] rounded z-10"
                        aria-label={showConfirmPassword ? 'Hide confirm new password' : 'Show confirm new password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="btn-primary btn-sm flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isChangingPass && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Change Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
