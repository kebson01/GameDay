import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, MapPin, Users, Database, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import AppHeader from '@/components/layout/AppHeader';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const lastUpdated = "December 11, 2025";

  return (
    <div className="gd-page !pb-0">
      {/* Header */}
      <AppHeader eyebrow="GameDay" title="Privacy Policy" subtitle={`Last updated: ${lastUpdated}`} back showProfile={false} />

      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="prose prose-slate max-w-none dark:prose-invert">
          
          {/* Introduction */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Introduction</h2>
            </div>
            <p className="text-slate-600">
              GameDay ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our 
              mobile application and related services (collectively, the "Service").
            </p>
            <p className="text-slate-600">
              By using GameDay, you agree to the collection and use of information in accordance with 
              this policy. If you do not agree with our policies, please do not use our Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Information We Collect</h2>
            </div>
            
            <h3 className="font-semibold text-slate-900 mt-6 mb-2">Personal Information</h3>
            <ul className="text-slate-600 space-y-2">
              <li><strong>Account Information:</strong> Email address, name, and profile information when you create an account.</li>
              <li><strong>Authentication Data:</strong> Login credentials and authentication tokens.</li>
            </ul>

            <h3 className="font-semibold text-slate-900 mt-6 mb-2">Location Data</h3>
            <ul className="text-slate-600 space-y-2">
              <li><strong>Real-time Location:</strong> When you enable location sharing, we collect your precise GPS location to show it to your group members.</li>
              <li><strong>Parked Car Location:</strong> When you save your car's location, we store these coordinates.</li>
              <li><strong>Tailgate Locations:</strong> Locations of tailgates you create or attend.</li>
            </ul>

            <h3 className="font-semibold text-slate-900 mt-6 mb-2">Usage Data</h3>
            <ul className="text-slate-600 space-y-2">
              <li>Features you use and interactions with the app</li>
              <li>Device information (device type, operating system)</li>
              <li>App performance and crash data</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">How We Use Your Information</h2>
            </div>
            <ul className="text-slate-600 space-y-2">
              <li><strong>Provide Services:</strong> Enable location sharing with your groups, car finding, and tailgate discovery.</li>
              <li><strong>Communication:</strong> Send you important updates about the Service.</li>
              <li><strong>Safety:</strong> Process emergency alerts and safety check-ins.</li>
              <li><strong>Improvements:</strong> Analyze usage to improve our Service.</li>
              <li><strong>Support:</strong> Respond to your inquiries and provide customer support.</li>
            </ul>
          </section>

          {/* Location Sharing */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Location Sharing</h2>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-amber-800 text-sm font-medium">
                ⚠️ Important: Your location is only shared with members of groups you explicitly join. 
                You can disable location sharing at any time in the app settings or per-group.
              </p>
            </div>
            <ul className="text-slate-600 space-y-2">
              <li>Location sharing is <strong>opt-in</strong> and can be toggled on/off at any time.</li>
              <li>Your location is only visible to members of groups you've joined.</li>
              <li>Location history is not permanently stored; only your current location is shared.</li>
              <li>When you leave a group, your location is no longer visible to that group.</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Data Security</h2>
            </div>
            <p className="text-slate-600">
              We implement appropriate technical and organizational security measures to protect your 
              personal information. However, no method of transmission over the Internet or electronic 
              storage is 100% secure.
            </p>
            <ul className="text-slate-600 space-y-2 mt-4">
              <li>Data is encrypted in transit using HTTPS/TLS</li>
              <li>Access to personal data is restricted to authorized personnel</li>
              <li>Regular security assessments and updates</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Data Retention</h2>
            <p className="text-slate-600">
              We retain your personal information for as long as your account is active or as needed 
              to provide you services. You can request deletion of your account and associated data 
              at any time by contacting us.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Your Rights</h2>
            <p className="text-slate-600 mb-4">You have the right to:</p>
            <ul className="text-slate-600 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of location sharing at any time</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Children's Privacy</h2>
            <p className="text-slate-600">
              Our Service is not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children under 13. If you are a parent or guardian 
              and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Changes to This Policy</h2>
            <p className="text-slate-600">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          {/* Contact Us */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Contact Us</h2>
            </div>
            <p className="text-slate-600">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mt-4">
              <p className="text-slate-700 font-medium">GameDay Support</p>
              <p className="text-slate-600">Email: privacy@gameday.app</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}


