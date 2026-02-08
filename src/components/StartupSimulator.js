export class StartupSimulator {
    constructor() {
        this.currentLevel = 1;
        this.currentRound = 1;
        this.levelScores = {};
        this.totalScore = 0;
        this.isActive = false;
        this.currentChoices = [];
        this.levelProgress = 0;
        this.levelGoal = 100;
        
        // Player stats that affect the game
        this.playerStats = {
            dau: 0,
            mrr: 0,
            funding: 0,
            teamSize: 0,
            morale: 100,
            runway: 12 // months
        };
        
        // Level definitions
        this.levels = this.initializeLevels();
        
        // Random events pool
        this.randomEvents = this.initializeRandomEvents();
    }
    
    initializeLevels() {
        return {
            1: {
                name: "Product Ideation",
                location: "Your Home",
                goal: "Validate problem-solution fit",
                goalTarget: 100,
                progressUnit: "validation",
                rounds: [
                    {
                        objective: "Choose your first startup idea to validate",
                        options: [
                            {
                                name: "AI-Powered Task Manager",
                                targetUser: "Busy professionals",
                                valueProposition: "Automates task prioritization using ML",
                                technicalFeasibility: "High complexity, requires AI expertise",
                                score: 75
                            },
                            {
                                name: "Local Food Delivery Platform",
                                targetUser: "Small restaurants & customers",
                                valueProposition: "Connects local eateries with nearby customers",
                                technicalFeasibility: "Medium complexity, proven model",
                                score: 85
                            },
                            {
                                name: "Blockchain Supply Chain",
                                targetUser: "Manufacturing companies",
                                valueProposition: "Transparent tracking of goods",
                                technicalFeasibility: "Very high complexity, emerging tech",
                                score: 65
                            }
                        ]
                    },
                    {
                        objective: "Select your validation method",
                        options: [
                            {
                                name: "Customer Interviews",
                                targetUser: "Direct user feedback",
                                valueProposition: "Deep insights into user needs",
                                technicalFeasibility: "Time-intensive but valuable",
                                score: 90
                            },
                            {
                                name: "Landing Page Test",
                                targetUser: "Broad market signal",
                                valueProposition: "Quick validation with metrics",
                                technicalFeasibility: "Easy to implement",
                                score: 80
                            },
                            {
                                name: "Prototype Testing",
                                targetUser: "Hands-on user experience",
                                valueProposition: "Real usage data",
                                technicalFeasibility: "Requires initial development",
                                score: 70
                            }
                        ]
                    },
                    {
                        objective: "Choose your initial market",
                        options: [
                            {
                                name: "Silicon Valley Tech Workers",
                                targetUser: "Early adopters",
                                valueProposition: "High willingness to try new tech",
                                technicalFeasibility: "Competitive market",
                                score: 80
                            },
                            {
                                name: "College Students",
                                targetUser: "Price-sensitive users",
                                valueProposition: "Viral potential, low budget",
                                technicalFeasibility: "Easy to reach",
                                score: 75
                            },
                            {
                                name: "Small Business Owners",
                                targetUser: "B2B customers",
                                valueProposition: "Higher revenue potential",
                                technicalFeasibility: "Longer sales cycles",
                                score: 85
                            }
                        ]
                    }
                ]
            },
            2: {
                name: "MVP Development",
                location: "Garage",
                goal: "Build a working MVP",
                goalTarget: 100,
                progressUnit: "development",
                rounds: [
                    {
                        objective: "Choose your core feature set",
                        options: [
                            {
                                name: "Essential Features Only",
                                coreFeature: "Login, basic functionality",
                                niceToHave: "None",
                                technicalDebt: "Minimal",
                                score: 90
                            },
                            {
                                name: "Feature-Rich MVP",
                                coreFeature: "Multiple features",
                                niceToHave: "Analytics, social",
                                technicalDebt: "Moderate",
                                score: 70
                            },
                            {
                                name: "Polished Experience",
                                coreFeature: "Core + great UX",
                                niceToHave: "Animations, themes",
                                technicalDebt: "Some UI debt",
                                score: 80
                            }
                        ]
                    },
                    {
                        objective: "Select your tech stack",
                        options: [
                            {
                                name: "Modern JavaScript",
                                coreFeature: "React + Node.js",
                                niceToHave: "Fast development",
                                technicalDebt: "Dependency management",
                                score: 85
                            },
                            {
                                name: "Traditional Stack",
                                coreFeature: "PHP + MySQL",
                                niceToHave: "Proven, stable",
                                technicalDebt: "Legacy concerns",
                                score: 75
                            },
                            {
                                name: "Cutting Edge",
                                coreFeature: "Rust + WASM",
                                niceToHave: "Performance",
                                technicalDebt: "Learning curve",
                                score: 70
                            }
                        ]
                    },
                    {
                        objective: "Choose development approach",
                        options: [
                            {
                                name: "Agile Sprints",
                                coreFeature: "2-week iterations",
                                niceToHave: "Flexibility",
                                technicalDebt: "Process overhead",
                                score: 85
                            },
                            {
                                name: "Rapid Prototyping",
                                coreFeature: "Ship daily",
                                niceToHave: "Fast feedback",
                                technicalDebt: "Quality risks",
                                score: 80
                            },
                            {
                                name: "Waterfall Planning",
                                coreFeature: "Detailed specs",
                                niceToHave: "Predictability",
                                technicalDebt: "Inflexibility",
                                score: 65
                            }
                        ]
                    }
                ]
            },
            3: {
                name: "Fundraising (Seed Round)",
                location: "Accelerator",
                goal: "Raise $5M",
                goalTarget: 5000000,
                progressUnit: "funding",
                rounds: [
                    {
                        objective: "Choose your lead investor",
                        options: [
                            {
                                name: "Angel Investor",
                                investorType: "Individual",
                                priorities: "Passion, vision",
                                terms: "Founder-friendly",
                                score: 80,
                                funding: 500000
                            },
                            {
                                name: "Seed VC Fund",
                                investorType: "Institution",
                                priorities: "Metrics, growth",
                                terms: "Standard terms",
                                score: 85,
                                funding: 2000000
                            },
                            {
                                name: "Strategic Partner",
                                investorType: "Corporate",
                                priorities: "Synergies",
                                terms: "Complex deal",
                                score: 75,
                                funding: 1500000
                            }
                        ]
                    },
                    {
                        objective: "Select your pitch strategy",
                        options: [
                            {
                                name: "Vision-Focused",
                                investorType: "Storytelling",
                                priorities: "Big picture",
                                terms: "Inspire investors",
                                score: 80,
                                funding: 1000000
                            },
                            {
                                name: "Traction-Based",
                                investorType: "Data-driven",
                                priorities: "User growth",
                                terms: "Prove demand",
                                score: 90,
                                funding: 1500000
                            },
                            {
                                name: "Team Credentials",
                                investorType: "Experience",
                                priorities: "Track record",
                                terms: "Founder focus",
                                score: 75,
                                funding: 1000000
                            }
                        ]
                    },
                    {
                        objective: "Choose additional investors",
                        options: [
                            {
                                name: "Syndicate Round",
                                investorType: "Multiple angels",
                                priorities: "Diverse network",
                                terms: "Complex cap table",
                                score: 85,
                                funding: 1000000
                            },
                            {
                                name: "Single Large Check",
                                investorType: "One major investor",
                                priorities: "Simple structure",
                                terms: "More dilution",
                                score: 70,
                                funding: 1500000
                            },
                            {
                                name: "Crowdfunding",
                                investorType: "Community",
                                priorities: "Marketing value",
                                terms: "Many stakeholders",
                                score: 75,
                                funding: 500000
                            }
                        ]
                    }
                ]
            },
            4: {
                name: "Team Building",
                location: "Startup Loft",
                goal: "Hire 5 key roles",
                goalTarget: 5,
                progressUnit: "hires",
                rounds: [
                    {
                        objective: "Hire your first engineer",
                        options: [
                            {
                                name: "Senior Engineer",
                                skill: "10+ years experience",
                                fit: "Mentorship ability",
                                cost: "$200k/year + equity",
                                score: 90,
                                hires: 1
                            },
                            {
                                name: "Mid-Level Developer",
                                skill: "5 years experience",
                                fit: "Good balance",
                                cost: "$150k/year + equity",
                                score: 85,
                                hires: 1
                            },
                            {
                                name: "Junior Developers (2)",
                                skill: "Recent grads",
                                fit: "High energy",
                                cost: "$100k/year each",
                                score: 75,
                                hires: 2
                            }
                        ]
                    },
                    {
                        objective: "Build your marketing team",
                        options: [
                            {
                                name: "Growth Hacker",
                                skill: "Data-driven marketer",
                                fit: "Startup experience",
                                cost: "$140k/year + equity",
                                score: 85,
                                hires: 1
                            },
                            {
                                name: "Content Marketer",
                                skill: "Brand storyteller",
                                fit: "Creative mindset",
                                cost: "$120k/year + equity",
                                score: 80,
                                hires: 1
                            },
                            {
                                name: "Marketing Intern Team",
                                skill: "Eager learners",
                                fit: "Fresh perspectives",
                                cost: "$60k/year total",
                                score: 70,
                                hires: 2
                            }
                        ]
                    },
                    {
                        objective: "Round out the team",
                        options: [
                            {
                                name: "Operations Manager",
                                skill: "Process expert",
                                fit: "Organized leader",
                                cost: "$130k/year + equity",
                                score: 85,
                                hires: 1
                            },
                            {
                                name: "Customer Success Lead",
                                skill: "User advocate",
                                fit: "Empathetic",
                                cost: "$110k/year + equity",
                                score: 80,
                                hires: 1
                            },
                            {
                                name: "Data Scientist",
                                skill: "Analytics expert",
                                fit: "Insights-driven",
                                cost: "$160k/year + equity",
                                score: 75,
                                hires: 1
                            }
                        ]
                    }
                ]
            },
            5: {
                name: "Go-to-Market",
                location: "Tech Conference",
                goal: "Acquire 1,000 users",
                goalTarget: 1000,
                progressUnit: "users",
                rounds: [
                    {
                        objective: "Launch your first campaign",
                        options: [
                            {
                                name: "Content Marketing",
                                reach: "Organic growth",
                                cac: "$0-10 per user",
                                conversion: "Slow but steady",
                                score: 85,
                                users: 200
                            },
                            {
                                name: "Paid Social Ads",
                                reach: "Targeted audience",
                                cac: "$25-50 per user",
                                conversion: "Quick results",
                                score: 80,
                                users: 350
                            },
                            {
                                name: "Influencer Partnership",
                                reach: "Large audience",
                                cac: "$15-30 per user",
                                conversion: "Variable quality",
                                score: 75,
                                users: 300
                            }
                        ]
                    },
                    {
                        objective: "Expand your reach",
                        options: [
                            {
                                name: "Product Hunt Launch",
                                reach: "Tech early adopters",
                                cac: "$5 per user",
                                conversion: "High-quality users",
                                score: 90,
                                users: 400
                            },
                            {
                                name: "Google Ads",
                                reach: "Search intent",
                                cac: "$30-60 per user",
                                conversion: "High intent",
                                score: 75,
                                users: 250
                            },
                            {
                                name: "Email Campaign",
                                reach: "Warm leads",
                                cac: "$2-5 per user",
                                conversion: "Good retention",
                                score: 85,
                                users: 300
                            }
                        ]
                    },
                    {
                        objective: "Optimize for growth",
                        options: [
                            {
                                name: "Referral Program",
                                reach: "Viral growth",
                                cac: "$10 per user",
                                conversion: "Compounding effect",
                                score: 90,
                                users: 350
                            },
                            {
                                name: "Partnership Channel",
                                reach: "B2B2C model",
                                cac: "$20 per user",
                                conversion: "Bulk acquisition",
                                score: 80,
                                users: 300
                            },
                            {
                                name: "Free Trial Optimization",
                                reach: "Conversion focus",
                                cac: "$0 acquisition",
                                conversion: "Higher close rate",
                                score: 85,
                                users: 250
                            }
                        ]
                    }
                ]
            },
            6: {
                name: "Scaling",
                location: "Data Center",
                goal: "Scale to 10,000 users",
                goalTarget: 10000,
                progressUnit: "capacity",
                rounds: [
                    {
                        objective: "Choose your architecture",
                        options: [
                            {
                                name: "Monolithic Architecture",
                                cost: "Low initial cost",
                                reliability: "Simple to maintain",
                                flexibility: "Hard to scale parts",
                                score: 75,
                                capacity: 3000
                            },
                            {
                                name: "Microservices",
                                cost: "Higher complexity",
                                reliability: "Fault isolation",
                                flexibility: "Scale independently",
                                score: 85,
                                capacity: 4000
                            },
                            {
                                name: "Serverless",
                                cost: "Pay per use",
                                reliability: "Managed by cloud",
                                flexibility: "Auto-scaling",
                                score: 90,
                                capacity: 3500
                            }
                        ]
                    },
                    {
                        objective: "Select your database strategy",
                        options: [
                            {
                                name: "SQL Database",
                                cost: "Predictable costs",
                                reliability: "ACID compliance",
                                flexibility: "Structured data",
                                score: 80,
                                capacity: 3000
                            },
                            {
                                name: "NoSQL Solution",
                                cost: "Scales horizontally",
                                reliability: "Eventually consistent",
                                flexibility: "Flexible schema",
                                score: 85,
                                capacity: 3500
                            },
                            {
                                name: "Hybrid Approach",
                                cost: "Best of both",
                                reliability: "Complex setup",
                                flexibility: "Maximum options",
                                score: 75,
                                capacity: 3000
                            }
                        ]
                    },
                    {
                        objective: "Implement monitoring",
                        options: [
                            {
                                name: "Basic Monitoring",
                                cost: "Low cost",
                                reliability: "Essential metrics",
                                flexibility: "Simple alerts",
                                score: 70,
                                capacity: 2500
                            },
                            {
                                name: "Full Observability",
                                cost: "Premium tools",
                                reliability: "Deep insights",
                                flexibility: "Predictive alerts",
                                score: 90,
                                capacity: 3500
                            },
                            {
                                name: "Custom Solution",
                                cost: "Development time",
                                reliability: "Tailored metrics",
                                flexibility: "Full control",
                                score: 80,
                                capacity: 3000
                            }
                        ]
                    }
                ]
            },
            7: {
                name: "Crisis Management",
                location: "Board Room",
                goal: "Survive the crisis",
                goalTarget: 100,
                progressUnit: "stability",
                rounds: [
                    {
                        objective: "Data breach discovered",
                        options: [
                            {
                                name: "Full Transparency",
                                severity: "High initial impact",
                                impact: "Trust building",
                                mitigationCost: "$500k legal/PR",
                                score: 85,
                                stability: 30
                            },
                            {
                                name: "Controlled Disclosure",
                                severity: "Managed narrative",
                                impact: "Some trust issues",
                                mitigationCost: "$300k response",
                                score: 75,
                                stability: 35
                            },
                            {
                                name: "Minimal Acknowledgment",
                                severity: "Risk of exposure",
                                impact: "Potential backlash",
                                mitigationCost: "$100k patches",
                                score: 60,
                                stability: 25
                            }
                        ]
                    },
                    {
                        objective: "Major competitor enters market",
                        options: [
                            {
                                name: "Aggressive Defense",
                                severity: "Burn rate increase",
                                impact: "Market share defense",
                                mitigationCost: "$2M marketing",
                                score: 80,
                                stability: 35
                            },
                            {
                                name: "Pivot Strategy",
                                severity: "Product changes",
                                impact: "New market niche",
                                mitigationCost: "$1M development",
                                score: 85,
                                stability: 40
                            },
                            {
                                name: "Partnership Approach",
                                severity: "Shared revenue",
                                impact: "Reduced competition",
                                mitigationCost: "$500k negotiation",
                                score: 75,
                                stability: 30
                            }
                        ]
                    },
                    {
                        objective: "Co-founder wants to leave",
                        options: [
                            {
                                name: "Generous Exit Package",
                                severity: "High cost",
                                impact: "Smooth transition",
                                mitigationCost: "$1M buyout",
                                score: 85,
                                stability: 35
                            },
                            {
                                name: "Vesting Negotiation",
                                severity: "Some tension",
                                impact: "Retain some equity",
                                mitigationCost: "$500k partial",
                                score: 80,
                                stability: 30
                            },
                            {
                                name: "Legal Enforcement",
                                severity: "Public drama",
                                impact: "Protect company",
                                mitigationCost: "$200k legal",
                                score: 65,
                                stability: 25
                            }
                        ]
                    }
                ]
            },
            8: {
                name: "Series A",
                location: "Venture Capital",
                goal: "$2M ARR + 50% QoQ growth",
                goalTarget: 2000000,
                progressUnit: "revenue",
                rounds: [
                    {
                        objective: "Demonstrate financial metrics",
                        options: [
                            {
                                name: "Focus on Revenue",
                                metrics: "Strong MRR growth",
                                structure: "Sales-heavy",
                                roadmap: "Revenue features",
                                score: 90,
                                revenue: 800000
                            },
                            {
                                name: "User Growth Story",
                                metrics: "DAU explosion",
                                structure: "Product-led",
                                roadmap: "Engagement features",
                                score: 80,
                                revenue: 600000
                            },
                            {
                                name: "Unit Economics",
                                metrics: "Profitable per user",
                                structure: "Efficiency focus",
                                roadmap: "Margin improvement",
                                score: 85,
                                revenue: 700000
                            }
                        ]
                    },
                    {
                        objective: "Present team structure",
                        options: [
                            {
                                name: "Executive Hires",
                                metrics: "C-suite buildout",
                                structure: "Traditional org",
                                roadmap: "Corporate maturity",
                                score: 85,
                                revenue: 600000
                            },
                            {
                                name: "Technical Depth",
                                metrics: "Engineering excellence",
                                structure: "Product focus",
                                roadmap: "Innovation pipeline",
                                score: 80,
                                revenue: 500000
                            },
                            {
                                name: "Sales Machine",
                                metrics: "Revenue team",
                                structure: "Growth oriented",
                                roadmap: "Market expansion",
                                score: 90,
                                revenue: 700000
                            }
                        ]
                    },
                    {
                        objective: "Outline growth strategy",
                        options: [
                            {
                                name: "Geographic Expansion",
                                metrics: "New markets",
                                structure: "Regional teams",
                                roadmap: "Global vision",
                                score: 85,
                                revenue: 600000
                            },
                            {
                                name: "Product Suite",
                                metrics: "Multiple products",
                                structure: "Product lines",
                                roadmap: "Platform play",
                                score: 80,
                                revenue: 500000
                            },
                            {
                                name: "Enterprise Focus",
                                metrics: "Upmarket move",
                                structure: "Enterprise sales",
                                roadmap: "Large contracts",
                                score: 90,
                                revenue: 700000
                            }
                        ]
                    }
                ]
            },
            9: {
                name: "Corporate Governance",
                location: "Law Firm",
                goal: "Establish governance",
                goalTarget: 100,
                progressUnit: "compliance",
                rounds: [
                    {
                        objective: "Structure the board",
                        options: [
                            {
                                name: "Independent Board",
                                impact: "Best practices",
                                complexity: "High overhead",
                                cost: "$500k/year",
                                score: 90,
                                compliance: 35
                            },
                            {
                                name: "Investor-Heavy Board",
                                impact: "VC control",
                                complexity: "Simpler setup",
                                cost: "$200k/year",
                                score: 75,
                                compliance: 30
                            },
                            {
                                name: "Founder Control",
                                impact: "Maximum flexibility",
                                complexity: "Governance risk",
                                cost: "$100k/year",
                                score: 70,
                                compliance: 25
                            }
                        ]
                    },
                    {
                        objective: "Implement compliance",
                        options: [
                            {
                                name: "Full SOC2 + ISO",
                                impact: "Enterprise ready",
                                complexity: "18-month process",
                                cost: "$300k implementation",
                                score: 90,
                                compliance: 40
                            },
                            {
                                name: "Basic Compliance",
                                impact: "Minimum viable",
                                complexity: "6-month process",
                                cost: "$100k implementation",
                                score: 75,
                                compliance: 30
                            },
                            {
                                name: "Gradual Approach",
                                impact: "Phased rollout",
                                complexity: "Ongoing effort",
                                cost: "$200k over time",
                                score: 80,
                                compliance: 35
                            }
                        ]
                    },
                    {
                        objective: "Define company culture",
                        options: [
                            {
                                name: "Performance Culture",
                                impact: "Results-driven",
                                complexity: "Clear metrics",
                                cost: "Variable comp",
                                score: 85,
                                compliance: 30
                            },
                            {
                                name: "Innovation Culture",
                                impact: "Creative freedom",
                                complexity: "Flexible structure",
                                cost: "R&D investment",
                                score: 80,
                                compliance: 25
                            },
                            {
                                name: "Mission-Driven",
                                impact: "Purpose-led",
                                complexity: "Values alignment",
                                cost: "Lower salaries",
                                score: 75,
                                compliance: 30
                            }
                        ]
                    }
                ]
            },
            10: {
                name: "Exit Strategy",
                location: "NASDAQ",
                goal: "Execute exit",
                goalTarget: 100,
                progressUnit: "completion",
                rounds: [
                    {
                        objective: "Choose exit path",
                        options: [
                            {
                                name: "IPO Preparation",
                                valuation: "$1B+ target",
                                timeline: "18-24 months",
                                risk: "Market dependent",
                                score: 90,
                                completion: 30
                            },
                            {
                                name: "Strategic Acquisition",
                                valuation: "$500M-1B",
                                timeline: "6-12 months",
                                risk: "Integration challenges",
                                score: 85,
                                completion: 35
                            },
                            {
                                name: "Private Equity",
                                valuation: "$300-500M",
                                timeline: "3-6 months",
                                risk: "Operational changes",
                                score: 75,
                                completion: 40
                            }
                        ]
                    },
                    {
                        objective: "Prepare the company",
                        options: [
                            {
                                name: "Financial Audit",
                                valuation: "Clean books",
                                timeline: "3 months",
                                risk: "Finding issues",
                                score: 85,
                                completion: 35
                            },
                            {
                                name: "Growth Acceleration",
                                valuation: "Higher multiple",
                                timeline: "6 months",
                                risk: "Burn rate",
                                score: 80,
                                completion: 30
                            },
                            {
                                name: "Strategic Positioning",
                                valuation: "Story crafting",
                                timeline: "2 months",
                                risk: "Market perception",
                                score: 75,
                                completion: 35
                            }
                        ]
                    },
                    {
                        objective: "Final negotiations",
                        options: [
                            {
                                name: "Maximize Valuation",
                                valuation: "Top dollar",
                                timeline: "Extended talks",
                                risk: "Deal falling through",
                                score: 85,
                                completion: 35
                            },
                            {
                                name: "Quick Close",
                                valuation: "Fair price",
                                timeline: "Fast execution",
                                risk: "Lower returns",
                                score: 80,
                                completion: 40
                            },
                            {
                                name: "Structured Deal",
                                valuation: "Earnouts + equity",
                                timeline: "Complex terms",
                                risk: "Future obligations",
                                score: 75,
                                completion: 30
                            }
                        ]
                    }
                ]
            }
        };
    }
    
    initializeRandomEvents() {
        return {
            positive: [
                "A tech blog featured your startup! User signups increased by 20%.",
                "Your team shipped a feature early. Morale is at an all-time high!",
                "A competitor shut down. Some of their users are migrating to you.",
                "Your latest feature went viral on social media. DAU spiked!",
                "An investor reached out expressing interest in your next round.",
                "Your team won a hackathon. The prize money extends your runway!",
                "A major partnership opportunity just opened up.",
                "Your app store rating hit 4.8 stars. Downloads are increasing!"
            ],
            negative: [
                "AWS costs spiked unexpectedly. Runway decreased by 1 month.",
                "A key engineer just gave notice. Hiring will slow development.",
                "A bug caused a 2-hour outage. Some users churned.",
                "A new competitor launched with significant funding.",
                "Your main investor is having portfolio issues. Follow-on funding uncertain.",
                "New regulations require compliance work. Development slowed.",
                "Your office lease is up. Moving costs will impact the budget.",
                "A negative review went viral. PR management needed."
            ],
            neutral: [
                "The team decided to switch to a new project management tool.",
                "Your competitor raised a new round. The market is heating up.",
                "A potential acquirer is sniffing around. Too early to tell if serious.",
                "Industry conference next month. Good networking opportunity.",
                "Your advisors suggest pivoting one feature. Worth considering.",
                "Market research shows changing user preferences.",
                "New tax laws passed. Consult with accountants needed.",
                "Office coffee machine broke. Productivity temporarily impacted."
            ]
        };
    }
    
    startLevel(levelNumber) {
        if (levelNumber < 1 || levelNumber > 10) {
            return null;
        }
        
        this.currentLevel = levelNumber;
        this.currentRound = 1;
        this.levelProgress = 0;
        this.isActive = true;
        this.levelScores[levelNumber] = { rounds: [], total: 0 };
        
        const level = this.levels[levelNumber];
        this.levelGoal = level.goalTarget;
        
        return this.getCurrentRoundData();
    }
    
    getCurrentRoundData() {
        const level = this.levels[this.currentLevel];
        if (!level || this.currentRound > level.rounds.length) {
            return null;
        }
        
        const round = level.rounds[this.currentRound - 1];
        return {
            level: this.currentLevel,
            levelName: level.name,
            location: level.location,
            round: this.currentRound,
            objective: round.objective,
            options: round.options.map((opt, index) => ({
                ...opt,
                number: index + 1
            })),
            goal: level.goal,
            goalTarget: level.goalTarget,
            progressUnit: level.progressUnit,
            currentProgress: this.levelProgress
        };
    }
    
    makeChoice(choiceNumber) {
        if (!this.isActive || choiceNumber < 1 || choiceNumber > 3) {
            return null;
        }
        
        const level = this.levels[this.currentLevel];
        const round = level.rounds[this.currentRound - 1];
        const choice = round.options[choiceNumber - 1];
        
        if (!choice) {
            return null;
        }
        
        // Calculate score and progress
        const roundScore = choice.score || 0;
        this.levelScores[this.currentLevel].rounds.push(roundScore);
        this.levelScores[this.currentLevel].total += roundScore;
        this.totalScore += roundScore;
        
        // Update progress based on level type
        if (choice.funding) {
            this.levelProgress += choice.funding;
            this.playerStats.funding += choice.funding;
        } else if (choice.users) {
            this.levelProgress += choice.users;
            this.playerStats.dau += choice.users;
        } else if (choice.hires) {
            this.levelProgress += choice.hires;
            this.playerStats.teamSize += choice.hires;
        } else if (choice.revenue) {
            this.levelProgress += choice.revenue;
            this.playerStats.mrr += Math.floor(choice.revenue / 12);
        } else if (choice.capacity) {
            this.levelProgress += choice.capacity;
        } else if (choice.stability) {
            this.levelProgress += choice.stability;
        } else if (choice.compliance) {
            this.levelProgress += choice.compliance;
        } else if (choice.completion) {
            this.levelProgress += choice.completion;
        } else {
            // Default progress for other levels
            this.levelProgress += Math.floor(roundScore / 3);
        }
        
        // Generate random event
        const randomEvent = this.generateRandomEvent();
        
        // Prepare result
        const result = {
            choice: choice.name,
            roundScore: roundScore,
            totalScore: this.levelScores[this.currentLevel].total,
            progress: this.levelProgress,
            progressPercent: Math.min(100, Math.floor((this.levelProgress / this.levelGoal) * 100)),
            randomEvent: randomEvent,
            playerStats: { ...this.playerStats }
        };
        
        // Check if round is complete
        this.currentRound++;
        
        // Check if level is complete
        if (this.currentRound > level.rounds.length) {
            result.levelComplete = true;
            result.levelSuccess = this.levelProgress >= this.levelGoal;
            result.finalScore = this.levelScores[this.currentLevel].total;
            this.isActive = false;
        }
        
        return result;
    }
    
    generateRandomEvent() {
        const eventTypes = ['positive', 'negative', 'neutral'];
        const weights = [0.3, 0.3, 0.4]; // 30% positive, 30% negative, 40% neutral
        
        let random = Math.random();
        let eventType = 'neutral';
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                eventType = eventTypes[i];
                break;
            }
        }
        
        const events = this.randomEvents[eventType];
        const event = events[Math.floor(Math.random() * events.length)];
        
        // Apply event effects
        if (eventType === 'positive') {
            this.playerStats.morale = Math.min(100, this.playerStats.morale + 10);
            if (event.includes('runway')) {
                this.playerStats.runway += 1;
            }
        } else if (eventType === 'negative') {
            this.playerStats.morale = Math.max(0, this.playerStats.morale - 10);
            if (event.includes('runway')) {
                this.playerStats.runway = Math.max(0, this.playerStats.runway - 1);
            }
        }
        
        return {
            type: eventType,
            message: event
        };
    }
    
    getLevelProgress() {
        return {
            level: this.currentLevel,
            round: this.currentRound,
            progress: this.levelProgress,
            goal: this.levelGoal,
            progressPercent: Math.min(100, Math.floor((this.levelProgress / this.levelGoal) * 100)),
            isActive: this.isActive
        };
    }
    
    getPlayerStats() {
        return { ...this.playerStats };
    }
    
    getTotalScore() {
        return this.totalScore;
    }
    
    getLevelScores() {
        return { ...this.levelScores };
    }
    
    reset() {
        this.currentLevel = 1;
        this.currentRound = 1;
        this.levelScores = {};
        this.totalScore = 0;
        this.isActive = false;
        this.currentChoices = [];
        this.levelProgress = 0;
        this.levelGoal = 100;
        this.playerStats = {
            dau: 0,
            mrr: 0,
            funding: 0,
            teamSize: 0,
            morale: 100,
            runway: 12
        };
    }
    
    /**
     * Maps building types to their corresponding simulator levels.
     * @returns {Object} Map of building type to level number
     */
    getBuildingLevelMap() {
        return {
            'house': 1,
            'garage': 2,
            'accelerator': 3,
            'loft': 4,
            'conference': 5,
            'data-center': 6,
            'board-room': 7,
            'venture': 8,
            'law': 9,
            'nasdaq': 10
        };
    }
    
    // Get level for a building type
    getLevelForBuilding(buildingType) {
        const map = this.getBuildingLevelMap();
        return map[buildingType] || null;
    }
}
