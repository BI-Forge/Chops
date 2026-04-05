/** Legal copy for the free-tier product (informational; not a substitute for professional legal review). */

export type LegalSection = {
  heading: string
  paragraphs: string[]
}

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: '1. Agreement',
    paragraphs: [
      'By creating an account and using ClickHouse OPS (the "Service"), you agree to these Terms and Conditions. If you do not agree, do not use the Service.',
      'The Service is provided as software you deploy and run. The free version may be offered without charge; features, availability, and pricing may change with reasonable notice where practicable.',
    ],
  },
  {
    heading: '2. Self-hosted deployment and your responsibility',
    paragraphs: [
      'The application is installed and operated on server infrastructure that you (or your organization) provide and control—not on infrastructure operated by the publisher solely for your exclusive use as a managed SaaS, unless you have separately agreed otherwise in writing.',
      'You bear full responsibility for choosing, provisioning, securing, patching, backing up, and monitoring the servers, networks, containers, databases, secrets, and any cloud or on‑premises resources used to run the Service and to reach your ClickHouse clusters.',
      'You are solely responsible for compliance with laws and regulations that apply to your deployment, your data, and your use of ClickHouse and related systems (including access controls, retention, export rules, and industry-specific requirements). The publisher does not control your environment and is not responsible for how or where you run the software.',
      'You indemnify and hold harmless the publisher and its affiliates from claims, damages, and costs arising from your infrastructure, your configuration, your credentials, your users’ actions, or your connection to third-party systems, except to the extent finally determined to be caused solely by the publisher’s gross negligence or willful misconduct where such limitation is not permitted by law.',
    ],
  },
  {
    heading: '3. What the Service does',
    paragraphs: [
      'ClickHouse OPS is a web application for monitoring and operating ClickHouse database clusters. It may include features such as metrics, query logs, process management, user and access-scope management connected to your ClickHouse environment, backups visibility, schema and table metadata, and application-level administration (for example system users, roles, and permissions) where enabled.',
      'You are responsible for configuring the Service to connect only to systems you are authorized to access. The Service acts as a client and control plane according to your configuration and credentials, running on hardware and networks under your control.',
    ],
  },
  {
    heading: '4. Your account',
    paragraphs: [
      'You must provide accurate registration information and keep your credentials secure. You are responsible for all activity under your account.',
      'We may suspend or terminate access if we reasonably believe there is a security risk, abuse, or violation of these terms.',
    ],
  },
  {
    heading: '5. Acceptable use',
    paragraphs: [
      'You will not use the Service to violate applicable law, infringe others’ rights, or probe or attack systems without authorization.',
      'You will not attempt to disrupt the Service, overload infrastructure, or access data or accounts belonging to others without permission.',
    ],
  },
  {
    heading: '6. Free version disclaimer',
    paragraphs: [
      'The free version is provided "as is" and "as available" without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, or non-infringement.',
      'We do not guarantee uninterrupted or error-free operation, data accuracy, or that the Service will meet your requirements. There is no committed uptime or support SLA for the free tier. Risks related to your servers, networks, dependencies, and integrations remain entirely with you.',
    ],
  },
  {
    heading: '7. Limitation of liability',
    paragraphs: [
      'To the maximum extent permitted by law, ClickHouse OPS and its operators (including BI Forge LLC where applicable) shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, goodwill, or business interruption, arising from your use of the Service—including any issues traceable to your hosting environment, misconfiguration, third-party services, or ClickHouse deployments.',
      'Total liability for any claim relating to the Service shall not exceed the greater of (a) the amounts you paid us for the Service in the twelve months before the claim or (b) zero for the free tier.',
    ],
  },
  {
    heading: '8. Changes',
    paragraphs: [
      'We may update these Terms from time to time. Continued use after changes become effective constitutes acceptance of the revised Terms. Material changes may be communicated through the application or other reasonable means where available.',
    ],
  },
  {
    heading: '9. Contact',
    paragraphs: [
      'For questions about these Terms, contact the party operating your deployment of ClickHouse OPS (for example your organization administrator or the publisher identified in the application).',
    ],
  },
]

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: '1. Overview',
    paragraphs: [
      'This Privacy Policy describes how ClickHouse OPS ("we", "us") handles information in connection with the free version of the Service. In the typical case, you install and run the application on your own servers or those of a provider you choose; you are the primary controller of that environment and of how data is stored, secured, and accessed there.',
      'Your deployment may be configured differently (for example managed by a third party on your behalf); in all cases, whoever operates the hosting layer shares responsibility with you for physical and logical security of that layer.',
    ],
  },
  {
    heading: '2. Information we process',
    paragraphs: [
      'Account data: when you register, we process your username, email address, and a cryptographic hash of your password. We may process profile identifiers and audit-related metadata needed to run authentication and authorization (for example roles and permissions within the application).',
      'Service usage: we may process technical logs (such as access logs, error logs, and security events) needed to operate and protect the Service.',
      'ClickHouse and infrastructure data: the Service displays and may store in memory or cache metadata and metrics retrieved from ClickHouse and related systems you connect. That data originates from your environment; you control what clusters and credentials are configured.',
    ],
  },
  {
    heading: '3. How we use information',
    paragraphs: [
      'We use account data to create and secure your session, enforce access controls, and communicate about the Service where appropriate.',
      'We use operational data to provide features you request, troubleshoot issues, improve reliability, and comply with law where required.',
      'We do not sell your personal information. We do not use it for third-party advertising in the free tier as described here.',
    ],
  },
  {
    heading: '4. Storage and security',
    paragraphs: [
      'Passwords are stored using strong one-way hashing. You should use a unique password and protect your login.',
      'Authentication may use tokens (for example JWT) stored in your browser (such as localStorage) for session continuity. Clear browser data or log out to end the session on that device.',
      'No method of transmission or storage is completely secure; we apply reasonable measures appropriate to the deployment context.',
    ],
  },
  {
    heading: '5. Retention',
    paragraphs: [
      'We retain account and operational records as needed to provide the Service, meet legal obligations, and resolve disputes. Retention periods depend on your operator’s configuration and applicable law.',
    ],
  },
  {
    heading: '6. Sharing',
    paragraphs: [
      'When you host the Service on your own or contracted infrastructure, any "sharing" of data with vendors (cloud hosts, managed Kubernetes, etc.) is governed by your agreements with those vendors, not by us as operator of your servers.',
      'We may share information with subprocessors only where we directly provide a hosted offering to you under a separate agreement, or when required by law or to protect rights and safety.',
      'If the Service runs on your organization’s systems, your organization’s policies and your administrators’ choices determine access, logging, and retention on that infrastructure.',
    ],
  },
  {
    heading: '7. Your choices',
    paragraphs: [
      'You may request access, correction, or deletion of your account data where applicable law and deployment capabilities allow. Contact your administrator or the Service operator for requests.',
    ],
  },
  {
    heading: '8. International transfers',
    paragraphs: [
      'If servers or personnel are located in different countries, data may be processed across borders. We take steps consistent with applicable requirements where they apply.',
    ],
  },
  {
    heading: '9. Children',
    paragraphs: [
      'The Service is not directed at children under 16 (or the minimum age in your jurisdiction). Do not register if you do not meet the age requirement.',
    ],
  },
  {
    heading: '10. Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. The effective date or notice may be shown in the application or release notes where available.',
    ],
  },
]
