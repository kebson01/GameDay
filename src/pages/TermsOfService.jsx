import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, XCircle, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import AppHeader from '@/components/layout/AppHeader';

export default function TermsOfService() {
  const navigate = useNavigate();
  const lastUpdated = "December 11, 2025";

  return (
    <div className="gd-page !pb-0">
      {/* Header */}
      <AppHeader eyebrow="GameDay" title="Terms of Service" subtitle={`Last updated: ${lastUpdated}`} back showProfile={false} />

      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="prose prose-slate max-w-none dark:prose-invert">
          
          {/* Agreement */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Agreement to Terms</h2>
            </div>
            <p className="text-slate-600">
              By accessing or using GameDay ("the Service"), you agree to be bound by these Terms of 
              Service ("Terms"). If you disagree with any part of the terms, you may not access the Service.
            </p>
            <p className="text-slate-600">
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          {/* Use of Service */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Acceptable Use</h2>
            </div>
            <p className="text-slate-600 mb-4">You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree to:</p>
            <ul className="text-slate-600 space-y-2">
              <li>Provide accurate and complete information when creating an account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use location sharing features responsibly and with respect for others' privacy</li>
              <li>Not use the Service to harass, abuse, or harm other users</li>
              <li>Not impersonate others or create fake accounts</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          {/* Prohibited Uses */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Prohibited Uses</h2>
            </div>
            <p className="text-slate-600 mb-4">You may not use the Service:</p>
            <ul className="text-slate-600 space-y-2">
              <li>To stalk, track, or monitor any person without their consent</li>
              <li>To share another person's location without their knowledge and consent</li>
              <li>For any illegal or unauthorized purpose</li>
              <li>To transmit any malware, viruses, or harmful code</li>
              <li>To attempt to gain unauthorized access to our systems</li>
              <li>To interfere with or disrupt the Service or servers</li>
              <li>To collect or store personal data about other users without their consent</li>
              <li>To spam or send unsolicited messages to other users</li>
            </ul>
          </section>

          {/* Location Services */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Location Services</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-amber-800 text-sm font-medium">
                ⚠️ Location sharing is a core feature of GameDay. By using location features, you 
                acknowledge and agree to share your location with group members.
              </p>
            </div>
            <ul className="text-slate-600 space-y-2">
              <li>Location sharing is voluntary and can be disabled at any time</li>
              <li>You are responsible for your own safety when sharing location</li>
              <li>We are not responsible for how other users may use your shared location</li>
              <li>Only share your location with people you trust</li>
            </ul>
          </section>

          {/* User Content */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">User Content</h2>
            <p className="text-slate-600">
              You retain ownership of any content you create or share through the Service (posts, 
              photos, tailgate descriptions, etc.). By posting content, you grant us a non-exclusive, 
              royalty-free license to use, display, and distribute that content within the Service.
            </p>
            <p className="text-slate-600 mt-4">
              You are solely responsible for your content and the consequences of posting it. We 
              reserve the right to remove any content that violates these Terms.
            </p>
          </section>

          {/* Account Termination */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Account Termination</h2>
            <p className="text-slate-600">
              We may terminate or suspend your account immediately, without prior notice or liability, 
              for any reason, including without limitation if you breach the Terms.
            </p>
            <p className="text-slate-600 mt-4">
              You may delete your account at any time through the app settings or by contacting us. 
              Upon termination, your right to use the Service will cease immediately.
            </p>
          </section>

          {/* Disclaimer */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Disclaimers</h2>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-600 text-sm">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
                EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
                SECURE, OR ERROR-FREE.
              </p>
              <p className="text-slate-600 text-sm mt-4">
                WE ARE NOT RESPONSIBLE FOR:
              </p>
              <ul className="text-slate-600 text-sm mt-2 space-y-1">
                <li>• Accuracy of location data</li>
                <li>• Actions of other users</li>
                <li>• Events at tailgates or gatherings organized through the Service</li>
                <li>• Loss of data or service interruptions</li>
                <li>• Any damages arising from use of the Service</li>
              </ul>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Scale className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Limitation of Liability</h2>
            </div>
            <p className="text-slate-600">
              IN NO EVENT SHALL GAMEDAY, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR 
              AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE 
              DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>
          </section>

          {/* Safety */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Safety</h2>
            <p className="text-slate-600">
              While we provide safety features like SOS alerts and check-ins, these are for 
              convenience only and should not be relied upon as your sole means of emergency 
              communication. In case of emergency, always contact local emergency services (911).
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Governing Law</h2>
            <p className="text-slate-600">
              These Terms shall be governed by and construed in accordance with the laws of the 
              United States, without regard to its conflict of law provisions.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Changes to Terms</h2>
            <p className="text-slate-600">
              We reserve the right to modify or replace these Terms at any time. If a revision is 
              material, we will try to provide at least 30 days notice prior to any new terms taking 
              effect. Continued use of the Service after changes constitute acceptance of the new Terms.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Contact Us</h2>
            <p className="text-slate-600">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mt-4">
              <p className="text-slate-700 font-medium">GameDay Support</p>
              <p className="text-slate-600">Email: legal@gameday.app</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}


