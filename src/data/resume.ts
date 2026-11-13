// The résumé shown on the Résumé page (src/pages/resume.astro).
// The wording follows the civilian résumé; both PDFs live in public/resume/.
// When the résumé changes, update the text here and replace the PDFs.

export const person = {
  name: 'Nicholas Cole Davis',
  role: 'Vulnerability Management & Security Engineer',
  place: 'Tokyo, Japan',
  phone: '+1 630-666-6416',
  email: 'nc.davis@outlook.com',
  linkedin: 'https://www.linkedin.com/in/nicholas-cole-davis-787917121/',
  github: 'https://github.com/colciferr',
};

export const downloads = [
  { text: 'Résumé (PDF)', href: '/resume/Nicholas-Cole-Davis-Resume.pdf' },
  { text: 'Government résumé (PDF)', href: '/resume/Nicholas-Cole-Davis-Government-Resume.pdf' },
];

export const summary =
  'Cybersecurity professional in the US Air Force since 2018, specializing in vulnerability management, patch automation, and Windows infrastructure. Designed and ran vulnerability management programs at four U.S. military bases. Builds PowerShell and Python API-driven tooling to automate patching and vulnerability analysis. Has led teams of up to 24 people. Based in Tokyo; available from February 2028; will require visa sponsorship.';

export const certifications: [string, string[]][] = [
  ['Cisco', ['CCNA', 'CCNA Cybersecurity', 'CCNA Automation']],
  ['CompTIA', ['Security+', 'Cloud+', 'A+', 'Project+ (in progress)']],
  ['Other', ['ITIL 4 Foundation', 'LPI Linux Essentials']],
];

export const competencies: [string, string[]][] = [
  ['Vulnerability Management', ['Tanium', 'Tenable Nessus', 'McAfee', 'Patch Management', 'Security Configuration Hardening']],
  ['Automation & Scripting', ['PowerShell', 'Python', 'GraphQL', 'Git']],
  ['Infrastructure & Systems', ['Active Directory', 'DNS', 'DHCP', 'Windows Server', 'Linux', 'Cisco Switching & Routing']],
  ['Data & Monitoring', ['Tenable.sc', 'SQL', 'Elasticsearch', 'Kibana']],
  ['Leadership & Management', ['Team Leadership', 'Project Management', 'ITIL 4 Foundation']],
];

export const employer = { name: 'United States Air Force', when: 'April 2018 – Present' };

export interface Role {
  title: string;
  when: string;
  where: string;
  points: string[];
}

export const roles: Role[] = [
  {
    title: 'IT Project Management Office Lead',
    when: 'June 2026 – Present',
    where: 'Yokota Air Base, Fussa, Tokyo, Japan',
    points: [
      'Leads a team of three project managers delivering new IT infrastructure and capabilities for 3,400 users.',
      'Reviews, triages, and prioritizes incoming requests; personally manages selected projects from requirements to delivery.',
    ],
  },
  {
    title: 'Cyber Defense Section Lead',
    when: 'January 2025 – June 2026',
    where: 'Yokota Air Base, Fussa, Tokyo, Japan',
    points: [
      'Led a multi-team cyber defense section, directing four managers and 20 technicians.',
      "Designed and implemented the base's vulnerability management program, covering 4,800 systems. Cut quarantined devices from about 500 to under 100 within four months and cut mean time to remediate from six days to three.",
      'Built an automated Python reporting pipeline that pulls vulnerability data from the Tanium API, enriches it with NIST and CISA Known Exploited Vulnerabilities (KEV) data, and produces a daily risk report for about 5,000 devices. Added a KEV dashboard ahead of a new policy to quarantine any device with a KEV. Estimated savings: about 1,900 technician hours per year.',
      'Wrote a PowerShell and automated patching training course and trained 10 technicians across two patching teams, with a practical assessment required before they could patch live systems.',
    ],
  },
  {
    title: 'Quality Assurance Evaluator',
    when: 'January 2024 – January 2025',
    where: 'Osan Air Base, South Korea',
    points: [
      'Led acceptance testing for three videoconference room upgrades in a 24/7 military command center.',
      'Conducted 41 hands-on performance evaluations of technicians and tracked cybersecurity, safety, and compliance requirements across the unit.',
      'Served on the inspection team for two large-scale US and South Korean military exercises, delivering 11 scenario injects and evaluating 36 mission tasks across four divisions.',
    ],
  },
  {
    title: 'Vulnerability Management Supervisor',
    when: 'July 2022 – January 2024',
    where: 'Eglin Air Force Base, Florida, USA',
    points: [
      'Trained and led an eight-person team maintaining U.S. Department of Defense cybersecurity compliance across 16,000+ systems.',
      "Coordinated vulnerability management and patching across 500 IT representatives: turned scan data into fix actions for each unit, reviewed technicians' proposed fixes, and quarantined systems that missed patch deadlines.",
      "Built the unit's vulnerability management program, replacing an ad hoc process in which staff checked scan results by hand and emailed IT representatives or remotely uninstalled software whenever a mandatory security directive came out.",
    ],
  },
  {
    title: 'Vulnerability Management Technician',
    when: 'August 2020 – July 2022',
    where: 'Eglin Air Force Base, Florida, USA',
    points: [
      'Monitored and remediated vulnerabilities across 16,000+ systems using Tenable Nessus and McAfee.',
      'Built semi-automated PowerShell patching workflows and an automated antivirus health check that saved an estimated 78,000 work hours across about 500 IT representatives.',
      'Deployed as Systems Administrator, Al Udeid Air Base, Qatar (July 2021 – January 2022): One of four administrators for a classified intelligence network serving 2,000 users at five sites across multiple countries in the US Air Forces Central region, including travel to those countries for on-site maintenance. Managed Active Directory, DNS, DHCP, switch and router configuration, and fiber routing. Maintained the network with no downtime or major incidents during the 2021 Afghanistan evacuation of 124,000 people.',
    ],
  },
  {
    title: 'Network Operations Center Technician',
    when: 'April 2018 – August 2020',
    where: 'Ramstein Air Base, Germany',
    points: [
      "Administered the base's McAfee endpoint security servers, delivering antivirus and security updates to 67,000 users.",
      'Used PowerShell to automate software deployments, updates, and removal of unauthorized devices.',
      'Conducted quarterly on-site security assessments: ran security configuration scans on unit servers, briefed leadership on findings, and recommended fixes.',
      'NATO Exercise Steadfast Cobalt, Bucharest, Romania (May 2019): Software tester on a team that executed 18,700 test cases validating communications interoperability between 25 allied nations on a federated multinational network.',
    ],
  },
];

export const education = {
  school: 'Western Governors University',
  degree: 'B.S., Network Engineering',
  when: 'December 2026',
};
