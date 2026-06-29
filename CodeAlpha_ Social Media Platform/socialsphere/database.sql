-- ============================================================
-- SocialSphere - MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS socialsphere CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE socialsphere;

-- ============================================================
-- Table: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    profile_picture VARCHAR(255) DEFAULT 'default-avatar.png',
    website VARCHAR(255),
    location VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- ============================================================
-- Table: posts
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    is_edited TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- Table: comments
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- Table: likes
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (post_id, user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- Table: followers
-- ============================================================
CREATE TABLE IF NOT EXISTS followers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL COMMENT 'The user who is following',
    following_id INT NOT NULL COMMENT 'The user being followed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_follow (follower_id, following_id),
    INDEX idx_follower_id (follower_id),
    INDEX idx_following_id (following_id)
) ENGINE=InnoDB;

-- ============================================================
-- Sample seed data (optional - for testing)
-- ============================================================

-- Insert sample users (passwords are bcrypt hash of "password123")
INSERT INTO users (username, email, password, full_name, bio, location) VALUES
('john_doe', 'john@example.com', '$2a$10$rQ5J5bGY4QQ5ZKK/rJi.5uJ8LY5BqI5yPuK5K5bG5bG5bG5bG5bG', 'John Doe', 'Software engineer & coffee enthusiast ☕', 'San Francisco, CA'),
('jane_smith', 'jane@example.com', '$2a$10$rQ5J5bGY4QQ5ZKK/rJi.5uJ8LY5BqI5yPuK5K5bG5bG5bG5bG5bG', 'Jane Smith', 'Designer | Creator | Dreamer ✨', 'New York, NY'),
('alex_dev', 'alex@example.com', '$2a$10$rQ5J5bGY4QQ5ZKK/rJi.5uJ8LY5BqI5yPuK5K5bG5bG5bG5bG5bG', 'Alex Dev', 'Full-stack developer | Open source contributor', 'Austin, TX');


-- ============================================================
-- SocialSphere — Seed Data
-- 100 Users + 100 Posts + comments, likes, follows
-- Password for ALL users: password123
-- bcrypt hash of "password123" with 10 rounds
-- ============================================================


-- Clear existing seed data (safe re-run)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE followers;
TRUNCATE TABLE likes;
TRUNCATE TABLE comments;
TRUNCATE TABLE posts;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 100 USERS
-- All passwords = "password123"
-- ============================================================
INSERT INTO users (username, email, password, full_name, bio, location, website) VALUES

('alex_morgan', 'alex.morgan@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex Morgan', 'Full-stack developer 🚀 | Coffee addict | Open source contributor', 'San Francisco, CA', 'https://alexmorgan.dev'),
('sarah_chen', 'sarah.chen@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah Chen', 'UI/UX Designer | Creating beautiful digital experiences ✨', 'New York, NY', 'https://sarahchen.design'),
('james_wilson', 'james.wilson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'James Wilson', 'Backend engineer | Python & Go enthusiast | Building cool stuff', 'Austin, TX', NULL),
('priya_patel', 'priya.patel@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Priya Patel', 'Machine learning researcher 🤖 | PhD @ Stanford | AI for good', 'Palo Alto, CA', 'https://priyapatel.ai'),
('marcus_lee', 'marcus.lee@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Marcus Lee', 'DevOps engineer | Kubernetes & Docker | Making deployments boring', 'Seattle, WA', NULL),
('emily_davis', 'emily.davis@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Emily Davis', 'Product manager by day, photographer by night 📷', 'Los Angeles, CA', 'https://emilydavis.photo'),
('ryan_kumar', 'ryan.kumar@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ryan Kumar', 'Startup founder | YC W23 | Building the future of fintech', 'San Jose, CA', 'https://fundflow.io'),
('jessica_park', 'jessica.park@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jessica Park', 'Frontend dev | React & Next.js | I turn designs into reality', 'Chicago, IL', NULL),
('daniel_brown', 'daniel.brown@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Daniel Brown', 'Security researcher | Bug bounty hunter | Ethical hacker 🔒', 'Boston, MA', 'https://danielbrown.sec'),
('nina_garcia', 'nina.garcia@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Nina Garcia', 'Data scientist | Turning numbers into stories 📊 | Python lover', 'Miami, FL', NULL),

('tom_nguyen', 'tom.nguyen@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Tom Nguyen', 'Mobile developer | iOS & Android | Swift & Kotlin enthusiast', 'Portland, OR', NULL),
('lisa_anderson', 'lisa.anderson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lisa Anderson', 'Technical writer | Making docs humans actually want to read', 'Denver, CO', 'https://lisaanderson.tech'),
('kevin_martinez', 'kevin.martinez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Kevin Martinez', 'Blockchain dev | Web3 | Smart contracts | NFT skeptic turned builder', 'Austin, TX', NULL),
('sophia_taylor', 'sophia.taylor@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sophia Taylor', 'Game developer 🎮 | Unity & Unreal | Indie game studio founder', 'Atlanta, GA', 'https://pixeldreams.games'),
('chris_johnson', 'chris.johnson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Chris Johnson', 'Cloud architect | AWS certified | Scaling systems to millions', 'Phoenix, AZ', NULL),
('amanda_white', 'amanda.white@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Amanda White', 'Cybersecurity analyst | CISSP | Breaking things to make them safer', 'Washington, DC', NULL),
('michael_scott', 'michael.scott@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Michael Scott', 'Engineering manager | Building & growing engineering teams', 'San Francisco, CA', NULL),
('rachel_kim', 'rachel.kim@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Rachel Kim', 'Frontend engineer | CSS wizard | Accessibility advocate ♿', 'Seattle, WA', 'https://rachelkim.dev'),
('david_clark', 'david.clark@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'David Clark', 'Software architect | System design | 15 years building at scale', 'New York, NY', NULL),
('mia_rodriguez', 'mia.rodriguez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mia Rodriguez', 'AR/VR developer | Spatial computing | Building the metaverse (the good kind)', 'Los Angeles, CA', NULL),

('ethan_hall', 'ethan.hall@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ethan Hall', 'Open source maintainer | Rust evangelist | Systems programming nerd', 'San Diego, CA', 'https://ethanhl.rs'),
('olivia_young', 'olivia.young@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Olivia Young', 'Growth hacker | 0 to 100k users | Data-driven everything', 'New York, NY', NULL),
('noah_hernandez', 'noah.hernandez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Noah Hernandez', 'Database administrator | PostgreSQL & MySQL | Query optimization wizard', 'Dallas, TX', NULL),
('ava_moore', 'ava.moore@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ava Moore', 'AI engineer | LLMs | Prompt engineering | Building with GPT-4', 'San Francisco, CA', 'https://avaai.dev'),
('liam_jackson', 'liam.jackson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Liam Jackson', 'SRE @ Google | Reliability engineering | Chaos monkey tamer', 'Mountain View, CA', NULL),
('chloe_harris', 'chloe.harris@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Chloe Harris', 'Product designer | Figma power user | Human-centered design advocate', 'Brooklyn, NY', 'https://chloeharris.design'),
('mason_lewis', 'mason.lewis@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mason Lewis', 'Embedded systems | IoT developer | Making hardware do cool things', 'Raleigh, NC', NULL),
('isabella_walker', 'isabella.walker@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Isabella Walker', 'CTO & co-founder | Ex-Amazon | Building developer tools people love', 'Seattle, WA', 'https://devtoolco.io'),
('logan_allen', 'logan.allen@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Logan Allen', 'Competitive programmer | 2x ICPC finalist | LeetCode addict', 'Cambridge, MA', NULL),
('zoe_king', 'zoe.king@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Zoe King', 'QA engineer | Test automation | Making sure bugs dont ship', 'Austin, TX', NULL),

('jackson_wright', 'jackson.wright@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jackson Wright', 'Senior dev @ Stripe | Payments infrastructure | Distributed systems', 'San Francisco, CA', NULL),
('luna_scott', 'luna.scott@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Luna Scott', 'CS student @ MIT | Internship @ Meta | Building side projects 24/7', 'Cambridge, MA', 'https://lunascott.me'),
('aiden_green', 'aiden.green@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Aiden Green', 'Freelance developer | 50+ projects shipped | React & Node specialist', 'Remote', 'https://aidengreen.co'),
('ella_baker', 'ella.baker@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ella Baker', 'Data engineer | Spark & Kafka | Building data pipelines that dont break', 'Chicago, IL', NULL),
('carter_adams', 'carter.adams@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carter Adams', 'Cloud native developer | Terraform | Infrastructure as code evangelist', 'Denver, CO', NULL),
('scarlett_nelson', 'scarlett.nelson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Scarlett Nelson', 'Engineering lead | Remote-first culture | Async communication champion', 'Portland, OR', NULL),
('henry_carter', 'henry.carter@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Henry Carter', 'Robotics engineer | ROS | Self-driving car researcher | Autonomous everything', 'Pittsburgh, PA', NULL),
('aria_mitchell', 'aria.mitchell@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Aria Mitchell', 'Platform engineer | Developer experience | Making devs productive', 'New York, NY', 'https://ariamitchell.dev'),
('sebastian_perez', 'sebastian.perez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sebastian Perez', 'Full-stack dev | Vue.js & Laravel | Coffee-driven development ☕', 'Miami, FL', NULL),
('grace_roberts', 'grace.roberts@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Grace Roberts', 'Bioinformatics researcher | Python for science | Code meets biology', 'Boston, MA', NULL),

('jack_turner', 'jack.turner@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jack Turner', 'Staff engineer @ Airbnb | Monorepo tooling | 10x team productivity', 'San Francisco, CA', NULL),
('lily_phillips', 'lily.phillips@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lily Phillips', 'Junior dev on a journey 🌱 | Day 312 of learning to code | Never giving up', 'Nashville, TN', 'https://lilycodes.blog'),
('owen_campbell', 'owen.campbell@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Owen Campbell', 'Platform architect | Multi-cloud | FinOps practitioner | Cost optimization', 'Chicago, IL', NULL),
('penelope_evans', 'penelope.evans@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Penelope Evans', 'Research engineer | NLP | Building AI that actually understands language', 'Menlo Park, CA', NULL),
('wyatt_edwards', 'wyatt.edwards@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Wyatt Edwards', 'Indie hacker | 3 SaaS products | $15k MRR | Bootstrapped & proud', 'Remote', 'https://wyatthacks.com'),
('nora_collins', 'nora.collins@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Nora Collins', 'Engineering coach | Helping engineers level up their careers', 'San Francisco, CA', 'https://noracoaches.dev'),
('elijah_stewart', 'elijah.stewart@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Elijah Stewart', 'Low-level programmer | OS development | Writing code close to the metal', 'San Jose, CA', NULL),
('hazel_sanchez', 'hazel.sanchez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hazel Sanchez', 'Front-end engineer | Web performance | Lighthouse score perfectionist', 'Los Angeles, CA', 'https://hazelsanchez.me'),
('leo_morris', 'leo.morris@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Leo Morris', 'Security engineer | Penetration testing | CTF player | HackTheBox top 1%', 'Las Vegas, NV', NULL),
('violet_rogers', 'violet.rogers@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Violet Rogers', 'CS professor @ Berkeley | Algorithms & complexity theory | Mentor to hundreds', 'Berkeley, CA', 'https://violetrogers.edu'),

('felix_reed', 'felix.reed@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Felix Reed', 'Full-stack dev | Svelte & Bun | Always chasing the next framework', 'Austin, TX', NULL),
('aurora_cook', 'aurora.cook@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Aurora Cook', 'UX researcher | User interviews | Making products that solve real problems', 'Seattle, WA', 'https://auroracook.ux'),
('miles_morgan', 'miles.morgan@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Miles Morgan', 'Principal engineer | Architecture reviews | Tech debt wrangler', 'New York, NY', NULL),
('stella_bell', 'stella.bell@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Stella Bell', 'Android developer | Jetpack Compose | Material You | Kotlin flows', 'San Francisco, CA', NULL),
('dominic_murphy', 'dominic.murphy@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dominic Murphy', 'GraphQL enthusiast | API design | REST is dead (I wish)', 'Dublin, Ireland', 'https://dominicmurphy.io'),
('ruby_bailey', 'ruby.bailey@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ruby Bailey', 'Data visualization | D3.js | Turning boring spreadsheets into beautiful charts', 'Portland, OR', 'https://rubyviz.art'),
('finn_rivera', 'finn.rivera@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Finn Rivera', 'DevRel engineer | Developer advocacy | Writing docs & building demos all day', 'San Francisco, CA', NULL),
('celeste_cooper', 'celeste.cooper@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Celeste Cooper', 'Platform security | Zero trust architecture | Never trusting, always verifying', 'Washington, DC', NULL),
('theo_richardson', 'theo.richardson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Theo Richardson', 'Startup CTO | Three failed startups, one growing | Lessons learned the hard way', 'New York, NY', 'https://theobuilds.com'),
('ivy_cox', 'ivy.cox@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ivy Cox', 'Machine learning ops | MLflow | Kubeflow | Making ML reproducible', 'Seattle, WA', NULL),

('oscar_ward', 'oscar.ward@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Oscar Ward', 'Elixir & Phoenix developer | Functional programming convert | LiveView fanatic', 'Remote', 'https://oscarward.dev'),
('maya_torres', 'maya.torres@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Maya Torres', 'Senior PM | Working at the intersection of tech and business | OKR champion', 'Chicago, IL', NULL),
('beau_peterson', 'beau.peterson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Beau Peterson', 'Web performance engineer | Core Web Vitals | Sub-100ms TTFB or bust', 'Minneapolis, MN', NULL),
('serena_gray', 'serena.gray@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Serena Gray', 'Open source contributor | Maintainer of 5 npm packages | Community builder', 'Toronto, Canada', 'https://serenagray.dev'),
('cole_james', 'cole.james@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cole James', 'Infrastructure engineer | Bare metal to serverless | Terraform fanatic', 'Austin, TX', NULL),
('iris_watson', 'iris.watson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Iris Watson', 'Computational biologist | Python & R | Where code meets science', 'Cambridge, MA', NULL),
('ezra_brooks', 'ezra.brooks@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ezra Brooks', 'Accessibility engineer | WCAG expert | Web for everyone, not just some', 'Denver, CO', 'https://ezra11y.dev'),
('luna_price', 'luna.price@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Luna Price', 'Junior frontend dev | 6 months in | Loving every bug and every fix', 'Phoenix, AZ', 'https://lunalearns.dev'),
('asher_bennett', 'asher.bennett@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Asher Bennett', 'Engineering director | Growing teams from 5 to 50 | Servant leader', 'San Francisco, CA', NULL),
('willow_wood', 'willow.wood@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Willow Wood', 'Creative technologist | Code + art | Generative art with p5.js | Teaching tech', 'Brooklyn, NY', 'https://willowcodes.art'),

('silas_barnes', 'silas.barnes@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Silas Barnes', 'Firmware engineer | C & Assembly | If it has a chip I can program it', 'Detroit, MI', NULL),
('freya_ross', 'freya.ross@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Freya Ross', 'Backend dev | Java & Spring Boot | Enterprise software that actually scales', 'New York, NY', NULL),
('beckett_henderson', 'beckett.henderson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Beckett Henderson', 'Quantitative developer | Financial algorithms | Python & C++ for trading', 'New York, NY', NULL),
('nova_coleman', 'nova.coleman@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Nova Coleman', 'Cloud developer advocate | Helping devs build on Azure | Learning in public', 'Seattle, WA', 'https://novacloud.dev'),
('remy_jenkins', 'remy.jenkins@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Remy Jenkins', 'Full-stack dev | Django & React | Building tools for small businesses', 'Atlanta, GA', NULL),
('esme_perry', 'esme.perry@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Esme Perry', 'Site reliability engineer | On-call veteran | Post-mortem writer extraordinaire', 'San Francisco, CA', NULL),
('cyrus_powell', 'cyrus.powell@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cyrus Powell', 'Distributed systems | Apache Kafka | Event-driven architecture for the win', 'Houston, TX', NULL),
('wren_long', 'wren.long@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Wren Long', 'UX engineer | Bridging the gap between design & code | Storybook enthusiast', 'Austin, TX', 'https://wrenlong.dev'),
('atlas_patterson', 'atlas.patterson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Atlas Patterson', 'Tech lead | Mentoring junior devs | Code review champion | Ship it!', 'Boston, MA', NULL),
('sage_hughes', 'sage.hughes@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sage Hughes', 'Platform engineer | Internal tooling | Making devs at my company happy', 'Remote', NULL),

('river_flores', 'river.flores@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'River Flores', 'WebAssembly developer | WASM in production | Rust to the browser pipeline', 'San Jose, CA', NULL),
('skye_washington', 'skye.washington@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Skye Washington', 'Growth engineer | A/B testing obsessive | Funnel optimization | 3x conversion', 'New York, NY', NULL),
('phoenix_butler', 'phoenix.butler@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Phoenix Butler', 'Senior iOS dev | SwiftUI expert | WWDC speaker | App Store featured twice', 'Cupertino, CA', NULL),
('bay_simmons', 'bay.simmons@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bay Simmons', 'Developer educator | YouTube: 200k subs | Teaching web dev to the world', 'Nashville, TN', 'https://baysimmons.dev'),
('indigo_foster', 'indigo.foster@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Indigo Foster', 'Compiler engineer | LLVM contributor | Making languages go brrr', 'Boston, MA', NULL),
('soleil_gonzalez', 'soleil.gonzalez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Soleil Gonzalez', 'AI safety researcher | Alignment | Making sure AI stays helpful and honest', 'Berkeley, CA', 'https://soleilai.org'),
('zephyr_diaz', 'zephyr.diaz@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Zephyr Diaz', 'Backend engineer | Microservices | gRPC | Protobuf fan | Go all the way', 'Seattle, WA', NULL),
('calla_ramirez', 'calla.ramirez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Calla Ramirez', 'Hardware engineer turned software dev | When you know both worlds', 'San Diego, CA', NULL),
('orion_james', 'orion.james@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Orion James', 'Networking engineer | BGP & OSPF | The internet literally runs through my hands', 'Dallas, TX', NULL),
('lyra_nguyen', 'lyra.nguyen@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lyra Nguyen', 'Recent grad | CS @ UCLA | Currently job hunting | Open to opportunities!', 'Los Angeles, CA', 'https://lyra-dev.github.io');

('arya_sharma', 'arya.sharma@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Arya Sharma', 'AI engineer 🤖 | Building intelligent systems | LLM enthusiast', 'Bangalore, India', 'https://aryasharma.dev'),
('rohan_mehta', 'rohan.mehta@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Rohan Mehta', 'Full-stack developer | React + Node.js | Startup builder', 'Mumbai, India', 'https://rohanbuilds.in'),
('kavya_reddy', 'kavya.reddy@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Kavya Reddy', 'UI/UX designer ✨ | Figma lover | Accessibility advocate', 'Hyderabad, India', NULL),
('aditya_verma', 'aditya.verma@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Aditya Verma', 'Cloud engineer ☁️ | AWS Certified | DevOps enthusiast', 'Pune, India', 'https://adityaverma.cloud'),
('meera_nair', 'meera.nair@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Meera Nair', 'Data scientist 📊 | Python | Turning data into decisions', 'Kochi, India', NULL),
('vikram_singh', 'vikram.singh@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Vikram Singh', 'Cybersecurity analyst 🔒 | Ethical hacker | Bug bounty hunter', 'Delhi, India', 'https://vikramsingh.security'),
('ananya_gupta', 'ananya.gupta@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ananya Gupta', 'Mobile app developer 📱 | Flutter & Kotlin | Building useful apps', 'Noida, India', NULL),
('dev_malhotra', 'dev.malhotra@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dev Malhotra', 'Machine Learning researcher | Computer Vision | Open-source contributor', 'Chandigarh, India', 'https://devml.ai'),
('isha_kapoor', 'isha.kapoor@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Isha Kapoor', 'Product Manager 🚀 | Building products people love', 'Gurgaon, India', NULL),
('arjun_patel', 'arjun.patel@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Arjun Patel', 'Backend engineer | Java & Spring Boot | Scalable systems', 'Ahmedabad, India', 'https://arjunpatel.tech');

-- ============================================================
-- 100 POSTS (varied, realistic content)
-- ============================================================
INSERT INTO posts (user_id, content, created_at) VALUES

(1,  'Just shipped a new feature that took 3 weeks to build and 3 minutes to deploy. The deploy felt way too short for all that work. But thats the beauty of CI/CD — when it works, it just works. 🚀', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2,  'Hot take: Most apps fail not because of bad code, but because of bad UX. You can have the most elegant backend in the world and it means nothing if users cant figure out how to use the product. Design IS engineering.', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(3,  'Finally finished migrating our monolith to microservices. Timeline estimate: 3 months. Actual time: 14 months. Things we learned:\n\n• Distributed systems are HARD\n• Network calls are not free\n• Team communication matters more than architecture\n• Sometimes the monolith was actually fine', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(4,  'Our new ML model achieves 97.3% accuracy on the test set but only 71% in production. Classic. Turns out the test data was from a totally different distribution. Back to the drawing board — but honestly this is where the real learning happens. 📊', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(5,  'Kubernetes tip of the day: Always set resource limits on your pods. I learned this the hard way when one rogue pod ate all the memory on a node and took down half our services at 2am on a Friday. Fun times. Not.', DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(6,  'I have been using the same Lightroom preset for 2 years and I still get excited every time I apply it. Photography is the one hobby where the right tools genuinely make you better. What is your go-to preset?', DATE_SUB(NOW(), INTERVAL 7 HOUR)),
(7,  'Raised our seed round! 🎉 18 months of grinding, 200+ investor meetings, 47 no-thank-yous, and we finally found the right partners. If you are building in fintech and want to chat, my DMs are open. The journey is just beginning.', DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(8,  'Spent all morning debugging a CSS centering issue. Tried flex, grid, absolute positioning, margin auto. None of it worked. Took a break. Came back. Noticed a typo in my class name. Fixed in 2 seconds. 40 minutes of my life gone forever.', DATE_SUB(NOW(), INTERVAL 9 HOUR)),
(9,  'Security reminder: Please stop storing passwords in plain text. Please. I have done 3 security audits this month and found this in 2 of them. Use bcrypt, argon2, or scrypt. Hash your passwords. This is not optional. 🔒', DATE_SUB(NOW(), INTERVAL 10 HOUR)),
(10, 'DataFrame tip: df.info() is your best friend when you first load a dataset. Always check dtypes, null counts, and memory usage before you do ANYTHING else. Save yourself hours of confusing errors later. #datascience #python', DATE_SUB(NOW(), INTERVAL 11 HOUR)),

(11, 'The Xcode simulator is running so hot right now that my MacBook Pro is using it as a space heater. Totally normal mobile development stuff. iOS development in 2024 is an adventure.', DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(12, 'Great docs are a competitive advantage. I consistently choose libraries and tools with better documentation over technically superior alternatives with bad docs. If you build for developers, invest in your docs.', DATE_SUB(NOW(), INTERVAL 13 HOUR)),
(13, 'Wrote my first smart contract today. Gas fees are genuinely wild. Paid more in fees to deploy a test contract than I make from some freelance projects. The economics of this space are fascinating and terrifying simultaneously.', DATE_SUB(NOW(), INTERVAL 14 HOUR)),
(14, 'Just hit 10,000 downloads on our indie game! We made it in 72 hours for a game jam 8 months ago and forgot about it. Passive success is the best kind. Maybe we should actually finish it now? 🎮', DATE_SUB(NOW(), INTERVAL 15 HOUR)),
(15, 'A properly designed auto-scaling setup is like having a superpower. Traffic spike at 3am? System handles it. Traffic drops at 6am? Scale back down, save money. The cloud really does change what is possible with infrastructure.', DATE_SUB(NOW(), INTERVAL 16 HOUR)),
(16, 'Social engineering is the most underrated attack vector. I just watched a pen tester talk someone into giving them server access by pretending to be IT support over the phone. No code required. Train your people, not just your systems.', DATE_SUB(NOW(), INTERVAL 17 HOUR)),
(17, 'Advice I wish I had gotten earlier in my career: Learn to give feedback before you learn to receive it. Knowing how to deliver hard truths kindly is one of the most valuable engineering skills that nobody talks about.', DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(18, 'The gap between a website that is just accessible versus one that is genuinely pleasant to use with a screen reader is enormous. I spent a week auditing our app and the number of issues I found was humbling. Accessibility is not a checkbox. It is a practice.', DATE_SUB(NOW(), INTERVAL 19 HOUR)),
(19, 'Architecture decision: We moved from a REST API to GraphQL and cut our over-fetching by 60%. Mobile data usage dropped significantly. Users on slow connections noticed immediately. Sometimes the hype around a technology is actually justified.', DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(20, 'Building a WebXR experience for the first time. Spatial UI is a completely different beast from flat UI. Every assumption I had about layout and navigation was wrong. This is what I imagine the early web felt like. Exciting chaos.', DATE_SUB(NOW(), INTERVAL 21 HOUR)),

(21, 'Unsafe code in Rust is not scary. It is just code where you take back the responsibility the compiler usually handles. The compiler says "I cannot check this, you sure?" and you say "yes, I am sure" and then you are very not sure at 1am.', DATE_SUB(NOW(), INTERVAL 22 HOUR)),
(22, 'User retention > user acquisition. Always. It is 5-7x cheaper to keep a user than to acquire a new one. We tripled our revenue this quarter not by finding new users but by reducing churn from 8% to 3%. Do the math.', DATE_SUB(NOW(), INTERVAL 23 HOUR)),
(23, 'Query optimization hall of fame: Found a query that was doing a full table scan on 40 million rows. Added one index. Query time went from 45 seconds to 12 milliseconds. The developer who wrote it (me, 2 years ago) sends his apologies.', DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(24, 'Fine-tuned our first LLM today on domain-specific data. The difference in output quality on our specific use case is remarkable. General models are impressive; specialized models are genuinely useful. Very different things.', DATE_SUB(NOW(), INTERVAL 25 HOUR)),
(25, 'SRE philosophy that changed how I think: Embrace failure. Not in a nihilistic way, but in a "failure will happen, so design for graceful degradation" way. Chaos engineering is not about breaking things. It is about finding what is already broken before users do.', DATE_SUB(NOW(), INTERVAL 26 HOUR)),
(26, 'Design critique: Stop using modals for everything. Modals interrupt the user flow, trap keyboard focus in ways users do not expect, and are notoriously hard to make accessible. Use them sparingly. Your users will thank you. Your developers will thank you. I will personally thank you.', DATE_SUB(NOW(), INTERVAL 27 HOUR)),
(27, 'The ESP32 is one of the most impressive chips for the price. WiFi, Bluetooth, dual-core processor, tons of GPIO pins — all for under $5. If you have never played with microcontrollers, start with ESP32. You will build something cool within a weekend.', DATE_SUB(NOW(), INTERVAL 28 HOUR)),
(28, 'When I joined this company 18 months ago, the interview process was broken and taking 6 weeks. We redesigned the entire thing, cut it to 2 weeks, and improved our offer acceptance rate by 40%. Hiring is a product. Treat it like one.', DATE_SUB(NOW(), INTERVAL 29 HOUR)),
(29, 'Finished my first ICPC regional. Solved 5 out of 7 problems. Got completely stuck on a graph problem I should have gotten. The best part? Found three people smarter than me and I can learn from them now. Losing is underrated as a learning tool.', DATE_SUB(NOW(), INTERVAL 30 HOUR)),
(30, 'Best investment in QA I have seen: writing a test for every bug found in production before fixing the bug. Sounds slow. Is slow at first. After 6 months, our regression rate dropped by 70%. The compound returns on test coverage are real.', DATE_SUB(NOW(), INTERVAL 31 HOUR)),

(31, 'Just reviewed code where someone had commented out the input validation because "it was causing errors." The errors were there for a reason. The validation was protecting against SQL injection. This is why we do code reviews.', DATE_SUB(NOW(), INTERVAL 32 HOUR)),
(32, 'Day 200 of learning to code. Can now build full CRUD apps from scratch without Googling every single thing. Progress feels slow until suddenly it does not. If you are early in your journey, just keep going. The click happens when you least expect it.', DATE_SUB(NOW(), INTERVAL 33 HOUR)),
(33, 'Cost optimization result from this quarter: Moved our batch processing jobs from always-on servers to spot instances with proper checkpointing. Same workload, 71% cost reduction. Infrastructure costs are a product problem disguised as an engineering problem.', DATE_SUB(NOW(), INTERVAL 34 HOUR)),
(34, 'Hot take: The transformer architecture is so well-suited to language that we are going to be using variations of it for the next 20 years. Every "transformer killer" ends up just being a transformer with extra steps. The intuition it captures is genuinely powerful.', DATE_SUB(NOW(), INTERVAL 35 HOUR)),
(35, 'Terraform tip: Use remote state from day one, even for personal projects. I cannot count how many times I have lost local state and had to either import everything manually or nuke and recreate. Just use S3 + DynamoDB. 20 minutes of setup saves hours of pain.', DATE_SUB(NOW(), INTERVAL 36 HOUR)),
(36, 'Team building lesson learned: The remote-first team that over-communicates in writing consistently outperforms the in-office team that has a lot of meetings. Write everything down. Async first. Meetings for the things only meetings can do.', DATE_SUB(NOW(), INTERVAL 37 HOUR)),
(37, 'ROS 2 is genuinely a game changer for robotics development. The DDS middleware layer solves so many real-time communication problems that were painful in ROS 1. If you are doing robotics research, the migration is worth the pain.', DATE_SUB(NOW(), INTERVAL 38 HOUR)),
(38, 'Developer experience is not a luxury. Slow CI/CD pipelines, poor local dev setup, unclear documentation — these cost real money in lost engineering hours. DX investment pays off fast. Every minute saved per deploy multiplied by deploy frequency multiplied by team size.', DATE_SUB(NOW(), INTERVAL 39 HOUR)),
(39, 'Vue 3 + Vite + Pinia is a genuinely excellent stack. The composition API clicked for me after years of being a React developer and now I find myself reaching for Vue for personal projects. Good tools should feel good to use.', DATE_SUB(NOW(), INTERVAL 40 HOUR)),
(40, 'A DNA sequencing algorithm I wrote in Python ran for 12 hours. Rewrote the core loop in Cython. Now runs in 40 minutes. Python is wonderful for prototyping. Production bioinformatics needs something closer to the metal.', DATE_SUB(NOW(), INTERVAL 41 HOUR)),

(41, 'Monorepo with Turborepo is one of those setups where the first few days feel like too much overhead and then suddenly you cannot imagine going back. Shared types, shared configs, one PR for cross-cutting changes. It is worth it.', DATE_SUB(NOW(), INTERVAL 42 HOUR)),
(42, 'Day 312. I finally debugged a problem I have been stuck on for three weeks. It was a semicolon in the wrong place inside a template literal. Three. Weeks. But I found it myself without asking for help, and that felt incredible. Do not give up.', DATE_SUB(NOW(), INTERVAL 43 HOUR)),
(43, 'Reserved instances vs on-demand: For predictable baseline load, reserved saves us about 60%. For variable workloads, spot with intelligent fallback saves even more. There is no one-size-fits-all answer, but there is almost always a better answer than pure on-demand.', DATE_SUB(NOW(), INTERVAL 44 HOUR)),
(44, 'We trained a model on customer support tickets and it now handles 65% of Tier 1 inquiries without human intervention. Customer satisfaction actually went UP because response time went from hours to seconds. AI in support is ready for production.', DATE_SUB(NOW(), INTERVAL 45 HOUR)),
(45, 'Book recommendation for engineers who want to level up: "Designing Data-Intensive Applications" by Martin Kleppmann. Read it once when you are junior. Read it again when you are mid-level. Read it a third time when you think you know everything. Different book each time.', DATE_SUB(NOW(), INTERVAL 46 HOUR)),
(46, 'New npm package published: a tiny utility for deep-equal comparison that is tree-shakeable and 200 bytes gzipped. Does one thing. Does it well. I am tired of pulling in lodash for a single function.', DATE_SUB(NOW(), INTERVAL 47 HOUR)),
(47, 'Low-level memory management in C is like driving a manual transmission car. More control, more responsibility, more ways to crash. But when you need that control, nothing else comes close. Understanding memory allocation made me a fundamentally better programmer at every level.', DATE_SUB(NOW(), INTERVAL 48 HOUR)),
(48, 'Profiling tip: Before optimizing anything, measure it. Twice. I spent a week optimizing a function that was called three times per day. The actual bottleneck was a completely different function I had not even looked at. Measure first, optimize second.', DATE_SUB(NOW(), INTERVAL 49 HOUR)),
(49, 'Wrote an entire CTF writeup for the challenge I solved this weekend. Reverse engineering a binary, finding the buffer overflow, crafting the payload. If you want to learn low-level security, CTFs are the best sandbox that exists.', DATE_SUB(NOW(), INTERVAL 50 HOUR)),
(50, 'CS education should include more systems programming. Understanding how the computer actually works — memory, processes, file systems — makes you a dramatically better developer at every abstraction level. The fundamentals compound.', DATE_SUB(NOW(), INTERVAL 51 HOUR)),

(51, 'Svelte 5 runes are a genuinely good DX improvement. Reactive state that is explicit without being verbose. After a week with it, going back to React feels like going back to writing jQuery. Every framework generation learns from the last.', DATE_SUB(NOW(), INTERVAL 52 HOUR)),
(52, 'User research insight from this week: We assumed users wanted more features. Interviews revealed they actually wanted fewer, better-explained features. We removed three features and added better onboarding. Activation rate improved 22%.', DATE_SUB(NOW(), INTERVAL 53 HOUR)),
(53, 'Long page load time = high bounce rate. This is not a hypothesis, it is data we proved on our own product. Every 100ms we shaved off LCP, we saw measurable improvement in conversion. Performance is a feature. Measure it. Prioritize it.', DATE_SUB(NOW(), INTERVAL 54 HOUR)),
(54, 'Open sourced a library I have been using internally for 2 years. First external issue filed 4 hours after publishing. Someone already using it in production. The open source ecosystem amazes me every time. People are incredible.', DATE_SUB(NOW(), INTERVAL 55 HOUR)),
(55, 'The hardest part of being a tech lead is not the technical decisions. It is the people decisions. Who to put on which problem, when to let someone struggle, when to step in. Technical skills got me here. People skills will determine how far I go.', DATE_SUB(NOW(), INTERVAL 56 HOUR)),
(56, 'D3.js has a steep learning curve and I would not change a thing about it. The mental model it forces you to build — data joins, selections, scales — transfers to every other data visualization tool. Learn the hard tool first sometimes.', DATE_SUB(NOW(), INTERVAL 57 HOUR)),
(57, 'Recorded my 50th developer relations video. Looking back at video 1 is genuinely painful to watch. The improvement from consistent practice is visible but invisible when you are in it. Create consistently. Improve constantly. Ship before you are ready.', DATE_SUB(NOW(), INTERVAL 58 HOUR)),
(58, 'Zero trust is not a product you buy, it is a philosophy you implement. Never trust, always verify — even inside the network perimeter. We finished our ZTA migration and the number of lateral movement risks we eliminated was sobering.', DATE_SUB(NOW(), INTERVAL 59 HOUR)),
(59, 'Startup number four. Two failed, one sold for enough to keep going, this one has real traction. The pattern I see: failure one taught me product, failure two taught me distribution, the exit taught me fundraising. Every failure was required curriculum.', DATE_SUB(NOW(), INTERVAL 60 HOUR)),
(60, 'MLflow experiment tracking is one of those tools that seems optional until you are three months into a project and need to reproduce an experiment from week two. Reproducibility is not a research concern — it is a production requirement.', DATE_SUB(NOW(), INTERVAL 61 HOUR)),

(61, 'Elixir supervision trees are the most elegant solution to "what happens when things fail" that I have encountered in any language. Let it crash, then restart cleanly. The OTP philosophy should be required reading for anyone building distributed systems.', DATE_SUB(NOW(), INTERVAL 62 HOUR)),
(62, 'OKRs work when leadership treats them as a tool for alignment, not measurement. When OKRs become a performance review mechanism, teams start setting safe, achievable OKRs instead of ambitious ones. The measurement corrupts the thing being measured.', DATE_SUB(NOW(), INTERVAL 63 HOUR)),
(63, 'Core Web Vitals update: After 6 months of systematic optimization work, our LCP went from 4.2s to 1.1s, FID from 180ms to 40ms, CLS from 0.28 to 0.04. All green. It took real engineering effort. It was worth it. Organic traffic up 34%.', DATE_SUB(NOW(), INTERVAL 64 HOUR)),
(64, 'The npm ecosystem is simultaneously the best and worst thing about JavaScript development. Need to do something? There is a package. That package has 47 dependencies. Two of them have CVEs. One is maintained by a single person in their free time. We all live here together.', DATE_SUB(NOW(), INTERVAL 65 HOUR)),
(65, 'Terraform modules are the right abstraction for infrastructure reuse. Instead of copy-pasting HCL across environments, extract the pattern into a module with variables. Our infrastructure is dramatically more consistent and easier to audit as a result.', DATE_SUB(NOW(), INTERVAL 66 HOUR)),
(66, 'Single-cell RNA sequencing analysis is one of those problems where the biology and the computer science are equally hard. The dimensionality reduction alone is a graduate-level math problem. I love that my job requires both.', DATE_SUB(NOW(), INTERVAL 67 HOUR)),
(67, 'The right way to do semantic HTML is not to think about it as accessibility compliance. Think about it as giving your content meaning that browsers, screen readers, search engines, and future developers can all understand. It makes everything better for everyone.', DATE_SUB(NOW(), INTERVAL 68 HOUR)),
(68, 'Week 6 of coding. Built my first API today! It just returns "Hello World" but it runs on MY computer and MY code made it work. Three months ago I could not write a for loop. Perspective is everything. Tiny wins compound.', DATE_SUB(NOW(), INTERVAL 69 HOUR)),
(69, 'The hardest scale problem we faced last year was not storage or compute — it was org design. At 200 engineers, how do you keep teams autonomous while maintaining platform consistency? We are still figuring it out. There is no solved answer here.', DATE_SUB(NOW(), INTERVAL 70 HOUR)),
(70, 'Generative art with code is the most fun I have had programming since I was a teenager. Writing a script that produces something visually unexpected is pure joy. p5.js is a perfect gateway if you want to start. Make something weird.', DATE_SUB(NOW(), INTERVAL 71 HOUR)),

(71, 'RTOS real-time scheduling is not as scary as it sounds once you understand preemption and priority inversion. The real scary part is timing analysis. Proving your system meets deadlines mathematically is genuinely hard and genuinely important for safety-critical systems.', DATE_SUB(NOW(), INTERVAL 72 HOUR)),
(72, 'Java Spring Boot gets unfairly mocked by the cool kids. For enterprise teams with mixed skill levels building high-traffic services, the conventions and ecosystem are genuinely productive. The right tool for the context. Context matters.', DATE_SUB(NOW(), INTERVAL 73 HOUR)),
(73, 'The difference between a quant developer and a software engineer in finance is mostly domain knowledge. The code is similar. The stakes are different. An off-by-one error in a trading algorithm costs money measured in scientific notation.', DATE_SUB(NOW(), INTERVAL 74 HOUR)),
(74, 'Built a deployment dashboard on Azure that cut our average deployment time awareness from 15 minutes to 2 minutes. Developers should not have to dig through logs to know if their deploy succeeded. Visibility is a feature.', DATE_SUB(NOW(), INTERVAL 75 HOUR)),
(75, 'Django admin has saved more MVPs than any other single piece of software I know. Bootstrap a backend in a weekend, get a full admin UI for free, iterate on the data model while talking to users. Do not underestimate good defaults.', DATE_SUB(NOW(), INTERVAL 76 HOUR)),
(76, 'Three a.m. incident post-mortem: Our alerting was alerting about the alerting system being down. By the time we fixed the alerting, the actual incident had resolved itself. Observability is only as good as the health of the observability system. Meta-monitoring matters.', DATE_SUB(NOW(), INTERVAL 77 HOUR)),
(77, 'Kafka consumer groups are one of those abstractions that once you understand deeply, you see opportunities to use everywhere. Horizontal scaling of message processing without coordination overhead. Simple idea. Profound implications.', DATE_SUB(NOW(), INTERVAL 78 HOUR)),
(78, 'Storybook has become my favorite tool for component documentation. Write the stories, get the docs, run visual regression tests from the same source. The ROI on component documentation is higher than most teams realize until they scale.', DATE_SUB(NOW(), INTERVAL 79 HOUR)),
(79, 'The best code review I ever received was one line: "This is correct. Is it the right abstraction?" Changed how I think about code for the rest of my career. Correctness and design are separate concerns and both matter.', DATE_SUB(NOW(), INTERVAL 80 HOUR)),
(80, 'Platform engineering is about multiplying developer productivity. Every hour I spend on internal tooling can save our 60-person engineering org 60 hours. The math is compelling once you see it.', DATE_SUB(NOW(), INTERVAL 81 HOUR)),

(81, 'WebAssembly in production update: Our compute-heavy workloads running WASM in the browser are 3x faster than the equivalent JS. The development experience is still rough but the performance wins are real. Worth watching this space.', DATE_SUB(NOW(), INTERVAL 82 HOUR)),
(82, 'Multivariate testing confession: We once had a significant A/B test result that turned out to be caused by a bug in the control group that inadvertently fixed a conversion blocker. Correlation and causation are hard to separate in growth experiments.', DATE_SUB(NOW(), INTERVAL 83 HOUR)),
(83, 'SwiftUI is mature enough for production now. After years of missing features and rough edges, the 2024 version is genuinely a productive framework. The declarative model maps well to how you think about UI. Apple finally nailed it.', DATE_SUB(NOW(), INTERVAL 84 HOUR)),
(84, 'Uploaded tutorial 200 today. The YouTube algorithm is mysterious and somewhat arbitrary, but consistency over time is the one thing that definitely works. The channels that win are not the ones that go viral. They are the ones that never stop.', DATE_SUB(NOW(), INTERVAL 85 HOUR)),
(85, 'Compiler errors are your friends. I know they look intimidating but a compiler that tells you exactly what is wrong is infinitely better than runtime errors in a dynamic language that silently misbehave. Type systems are documentation that cannot lie.', DATE_SUB(NOW(), INTERVAL 86 HOUR)),
(86, 'AI alignment is not a problem for the future. It is a problem for today. Every design decision in how AI systems are trained and deployed has alignment implications. We do not have the luxury of figuring this out after deployment at scale.', DATE_SUB(NOW(), INTERVAL 87 HOUR)),
(87, 'gRPC over REST for internal service communication is one of those decisions that pays dividends as you scale. Strongly typed contracts, bi-directional streaming, automatic code generation. The setup cost is real. The benefits compound.', DATE_SUB(NOW(), INTERVAL 88 HOUR)),
(88, 'Spent three years as a hardware engineer before switching to software. The perspective it gives me on memory, registers, and performance is something I would not trade. Every layer of abstraction is hiding real physics. Remembering that changes how you write code.', DATE_SUB(NOW(), INTERVAL 89 HOUR)),
(89, 'BGP routing is the duct tape that holds the internet together and it is simultaneously elegant and terrifying. Understanding how autonomous systems actually talk to each other demystifies so much of how the internet actually works.', DATE_SUB(NOW(), INTERVAL 90 HOUR)),
(90, 'Applied to 30 jobs this month. 4 phone screens, 2 technical interviews, 0 offers yet. Everyone says the job market is hard and it is absolutely true. But I am learning so much from each technical interview. Treating rejections as tuition.', DATE_SUB(NOW(), INTERVAL 91 HOUR)),

(91, 'If you are writing a REST API today, please think hard about your versioning strategy before you launch. Changing a live API is one of the most painful things in software engineering. Plan for change from day one.', DATE_SUB(NOW(), INTERVAL 92 HOUR)),
(92, 'The mental model shift that made React make sense to me: stop thinking about DOM manipulation and start thinking about deriving UI from state. The framework handles the reconciliation. Your job is to describe what the UI should look like given the data.', DATE_SUB(NOW(), INTERVAL 93 HOUR)),
(93, 'PostgreSQL is my default database for everything. Relational data model, incredible JSON support, full-text search, PostGIS for geo, great replication. It does so many things well that I rarely need to reach for anything else.', DATE_SUB(NOW(), INTERVAL 94 HOUR)),
(94, 'Shipped a feature that took me 6 hours to build and 40 minutes of debugging. Getting faster. Six months ago that feature would have taken me a week. Consistent practice over time is the only real path to skill. There are no shortcuts, only compounding effort.', DATE_SUB(NOW(), INTERVAL 95 HOUR)),
(95, 'On-call rotation lesson: Write runbooks for every alert that fires more than twice. If you are debugging the same problem more than once, the third time should be zero-thought execution. Document the solution, not just the alert.', DATE_SUB(NOW(), INTERVAL 96 HOUR)),
(96, 'There is something beautiful about a language designed for concurrency from the ground up. Go channels and goroutines make concurrent code readable in a way that threads and mutexes never quite managed. The language design shapes how you think about the problem.', DATE_SUB(NOW(), INTERVAL 97 HOUR)),
(97, 'Design system update: Shipped our internal component library to our third product team. Consistency is now automatic rather than something designers and devs have to manually enforce. Design systems are infrastructure. Treat them with the same rigor.', DATE_SUB(NOW(), INTERVAL 98 HOUR)),
(98, 'If you lead a team, be the first to admit when you do not know something. Psychological safety is not a soft metric. It is the rate at which your team surfaces problems early versus late. Early problems are cheap. Late problems are expensive.', DATE_SUB(NOW(), INTERVAL 99 HOUR)),
(99, 'Learned more computer science in one year of building things and deliberately practicing than I learned in three years of university lectures. Theory matters. Building matters more. Doing both at the same time matters most.', DATE_SUB(NOW(), INTERVAL 100 HOUR)),
(100,'Today I pushed my first commit to a real open source project. It was a one-line documentation fix. The maintainer merged it within an hour and said thank you. I know it is tiny but it felt enormous. Contributing to something that thousands of people use. Start small. Start anywhere. Just start.', DATE_SUB(NOW(), INTERVAL 101 HOUR));

-- ============================================================
-- FOLLOWS (realistic social graph)
-- ============================================================
INSERT INTO followers (follower_id, following_id) VALUES
(3,1),(4,1),(5,1),(6,1),(7,1),(8,1),(9,1),(10,1),
(1,2),(3,2),(4,2),(11,2),(12,2),(13,2),(14,2),(15,2),
(1,3),(2,3),(5,3),(6,3),(7,3),(16,3),(17,3),(18,3),
(1,4),(2,4),(3,4),(19,4),(20,4),(21,4),(22,4),(23,4),
(1,5),(3,5),(7,5),(25,5),(26,5),(27,5),(28,5),
(2,6),(8,6),(12,6),(29,6),(30,6),(31,6),
(1,7),(3,7),(5,7),(32,7),(33,7),(34,7),(35,7),
(2,8),(6,8),(11,8),(36,8),(37,8),(38,8),
(1,9),(5,9),(10,9),(39,9),(40,9),(41,9),(42,9),
(3,10),(4,10),(9,10),(43,10),(44,10),(45,10),
(8,11),(12,11),(15,11),(46,11),(47,11),(48,11),
(6,12),(11,12),(13,12),(49,12),(50,12),
(7,13),(9,13),(14,13),(51,13),(52,13),(53,13),
(2,14),(4,14),(13,14),(54,14),(55,14),
(5,15),(7,15),(16,15),(56,15),(57,15),(58,15),
(9,16),(15,16),(17,16),(59,16),(60,16),
(1,17),(3,17),(18,17),(61,17),(62,17),(63,17),
(2,18),(8,18),(17,18),(64,18),(65,18),
(4,19),(6,19),(20,19),(66,19),(67,19),(68,19),
(3,20),(5,20),(19,20),(69,20),(70,20),
(21,1),(22,2),(23,3),(24,4),(26,6),(27,7),(28,8),(29,9),(30,10),
(31,11),(32,12),(33,13),(34,14),(35,15),(36,16),(37,17),(38,18),(39,19),(40,20),
(41,21),(42,22),(43,23),(44,24),(45,25),(46,26),(47,27),(48,28),(49,29),(50,30),
(51,1),(52,2),(53,3),(54,4),(55,5),(56,6),(57,7),(58,8),(59,9),(60,10),
(61,11),(62,12),(63,13),(64,14),(65,15),(66,16),(67,17),(68,18),(69,19);

-- ============================================================
-- LIKES (spread across posts)
-- ============================================================
INSERT INTO likes (post_id, user_id) VALUES
(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),
(2,1),(2,3),(2,5),(2,7),(2,9),(2,11),(2,13),(2,15),(2,17),(2,19),
(3,1),(3,2),(3,4),(3,6),(3,8),(3,10),(3,12),(3,14),(3,16),(3,18),(3,20),
(4,1),(4,2),(4,3),(4,5),(4,7),(4,9),(4,11),(4,13),(4,15),
(5,1),(5,2),(5,3),(5,4),(5,6),(5,8),(5,10),(5,12),(5,14),
(6,1),(6,2),(6,3),(6,4),(6,5),(6,7),(6,9),(6,11),
(7,1),(7,2),(7,3),(7,4),(7,5),(7,6),(7,8),(7,10),(7,12),(7,14),(7,16),(7,18),(7,20),
(8,1),(8,2),(8,3),(8,4),(8,5),(8,6),(8,7),(8,9),(8,11),(8,13),(8,15),(8,17),
(9,1),(9,2),(9,3),(9,4),(9,5),(9,6),(9,7),(9,8),(9,10),(9,12),(9,14),
(10,1),(10,2),(10,3),(10,4),(10,5),(10,6),(10,7),(10,8),(10,9),(10,11),
(11,1),(11,2),(11,3),(11,4),(11,5),(11,6),(11,7),(11,8),(11,9),(11,10),
(12,2),(12,4),(12,6),(12,8),(12,10),(12,12),(12,14),(12,16),
(13,1),(13,3),(13,5),(13,7),(13,9),(13,11),(13,13),(13,15),
(14,2),(14,4),(14,6),(14,8),(14,10),(14,12),(14,14),(14,16),(14,18),(14,20),
(15,1),(15,3),(15,5),(15,7),(15,9),(15,11),(15,13),(15,15),
(16,2),(16,4),(16,6),(16,8),(16,10),(16,12),(16,14),
(17,1),(17,3),(17,5),(17,7),(17,9),(17,11),(17,13),(17,15),(17,17),
(18,2),(18,4),(18,6),(18,8),(18,10),(18,12),(18,14),(18,16),(18,18),
(19,1),(19,3),(19,5),(19,7),(19,9),(19,11),(19,13),
(20,2),(20,4),(20,6),(20,8),(20,10),(20,12),(20,14),(20,16),(20,18),
(21,1),(21,3),(21,5),(21,7),(21,9),(21,11),(21,13),(21,15),
(22,2),(22,4),(22,6),(22,8),(22,10),(22,12),(22,14),
(23,1),(23,3),(23,5),(23,7),(23,9),(23,11),(23,13),(23,15),(23,17),
(24,2),(24,4),(24,6),(24,8),(24,10),(24,12),(24,14),(24,16),(24,18),(24,20),
(25,1),(25,3),(25,5),(25,7),(25,9),(25,11),(25,13),
(26,2),(26,4),(26,6),(26,8),(26,10),(26,12),(26,14),(26,16),
(27,1),(27,3),(27,5),(27,7),(27,9),(27,11),
(28,2),(28,4),(28,6),(28,8),(28,10),(28,12),(28,14),(28,16),(28,18),
(29,1),(29,3),(29,5),(29,7),(29,9),(29,11),(29,13),(29,15),
(30,2),(30,4),(30,6),(30,8),(30,10),(30,12),(30,14),
(31,1),(31,3),(31,5),(31,7),(31,9),(31,11),(31,13),(31,15),(31,17),
(32,2),(32,4),(32,6),(32,8),(32,10),(32,12),(32,14),(32,16),(32,18),(32,20),
(33,1),(33,3),(33,5),(33,7),(33,9),(33,11),(33,13),
(34,2),(34,4),(34,6),(34,8),(34,10),(34,12),(34,14),(34,16),
(35,1),(35,3),(35,5),(35,7),(35,9),(35,11),(35,13),(35,15),
(36,2),(36,4),(36,6),(36,8),(36,10),(36,12),
(37,1),(37,3),(37,5),(37,7),(37,9),(37,11),(37,13),(37,15),(37,17),
(38,2),(38,4),(38,6),(38,8),(38,10),(38,12),(38,14),(38,16),
(39,1),(39,3),(39,5),(39,7),(39,9),(39,11),(39,13),
(40,2),(40,4),(40,6),(40,8),(40,10),(40,12);

-- ============================================================
-- COMMENTS (realistic conversations)
-- ============================================================
INSERT INTO comments (post_id, user_id, content, created_at) VALUES

(1, 3, 'The CI/CD pipeline feeling is real. Our deploys take 4 minutes and I still feel nervous every time.', DATE_SUB(NOW(), INTERVAL 100 MINUTE)),
(1, 5, 'Three weeks of work deserves a longer deploy honestly! What stack are you on?', DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
(1, 1, 'Docker + GitHub Actions + Railway. Nothing fancy but it works.', DATE_SUB(NOW(), INTERVAL 80 MINUTE)),
(1, 8, 'The best deploys are the boring ones 🚀', DATE_SUB(NOW(), INTERVAL 70 MINUTE)),

(2, 1, 'Completely agree. Shipped beautiful code that users could not understand how to navigate. Painful lesson.', DATE_SUB(NOW(), INTERVAL 160 MINUTE)),
(2, 8, 'This is why I think every backend engineer should spend a week doing user interviews. Changes your perspective.', DATE_SUB(NOW(), INTERVAL 150 MINUTE)),
(2, 4, 'The design is the product. The code is just the implementation.', DATE_SUB(NOW(), INTERVAL 140 MINUTE)),

(3, 1, 'What made you go with microservices vs keeping the monolith? Sounds like it was painful.', DATE_SUB(NOW(), INTERVAL 220 MINUTE)),
(3, 5, 'The microservices hype is real. We went through the same journey. Worth it at scale, brutal in the middle.', DATE_SUB(NOW(), INTERVAL 200 MINUTE)),
(3, 3, 'The network call thing is so true. Latency adds up in ways you never expect when testing locally.', DATE_SUB(NOW(), INTERVAL 180 MINUTE)),

(7, 1, 'Congratulations! 200 investor meetings is incredible persistence. What was the hardest part?', DATE_SUB(NOW(), INTERVAL 450 MINUTE)),
(7, 4, 'Finding the right investors is like product-market fit for fundraising. Takes iteration. Congrats!', DATE_SUB(NOW(), INTERVAL 430 MINUTE)),
(7, 7, 'Thank you both! Hardest part was keeping the team motivated through the rejections. Culture eats fundraising.', DATE_SUB(NOW(), INTERVAL 410 MINUTE)),
(7, 10, 'The journey IS the product. Congrats on the milestone! Rooting for you.', DATE_SUB(NOW(), INTERVAL 390 MINUTE)),

(8, 3, 'I have lost DAYS to typos in class names. The most recent one: "btn-prmiary". Two hours. I am a professional.', DATE_SUB(NOW(), INTERVAL 510 MINUTE)),
(8, 11, 'CSS debugging is humbling regardless of how senior you are. Every time.', DATE_SUB(NOW(), INTERVAL 500 MINUTE)),
(8, 2, 'This is why I always spell-check class names before debugging the actual CSS 😅', DATE_SUB(NOW(), INTERVAL 490 MINUTE)),

(9, 5, 'I audit codebases for fun and plain text passwords are more common than anyone admits. Always a shock.', DATE_SUB(NOW(), INTERVAL 570 MINUTE)),
(9, 1, 'bcryptjs all day. Easy to add, impossible to regret.', DATE_SUB(NOW(), INTERVAL 560 MINUTE)),
(9, 9, 'Argon2id is the current recommendation from OWASP if anyone wants the modern choice.', DATE_SUB(NOW(), INTERVAL 550 MINUTE)),

(23, 3, 'The 45-second query becoming 12ms story never gets old. What was the missing index on?', DATE_SUB(NOW(), INTERVAL 1400 MINUTE)),
(23, 1, 'Composite index on (user_id, created_at). Every slow query is obvious in hindsight.', DATE_SUB(NOW(), INTERVAL 1380 MINUTE)),
(23, 10, 'EXPLAIN ANALYZE is the best tool in the DBA toolbox. Should be taught day one.', DATE_SUB(NOW(), INTERVAL 1360 MINUTE)),

(32, 8, 'Day 312 and still going! That persistence is going to pay off big. What are you building?', DATE_SUB(NOW(), INTERVAL 1900 MINUTE)),
(32, 18, 'The click is real and it is incredible when it happens. Keep going!', DATE_SUB(NOW(), INTERVAL 1880 MINUTE)),
(32, 32, 'A CRUD app from scratch is not a small thing. That is real progress. Well done.', DATE_SUB(NOW(), INTERVAL 1860 MINUTE)),

(45, 2, 'DDIA is on my annual re-read list. Chapter on distributed transactions alone is worth the price.', DATE_SUB(NOW(), INTERVAL 2600 MINUTE)),
(45, 3, 'The chapter on replication changed how I think about consistency tradeoffs forever.', DATE_SUB(NOW(), INTERVAL 2580 MINUTE)),
(45, 45, 'What other books would people add to this list? Thinking of doing a reading thread.', DATE_SUB(NOW(), INTERVAL 2560 MINUTE)),
(45, 19, '"A Philosophy of Software Design" by John Ousterhout is my other must-read recommendation.', DATE_SUB(NOW(), INTERVAL 2540 MINUTE)),

(68, 2, 'This comment made my week. Day 6 of YOUR journey! Incredible.', DATE_SUB(NOW(), INTERVAL 3900 MINUTE)),
(68, 32, 'Three months ago to building APIs. That trajectory is going to take you very far.', DATE_SUB(NOW(), INTERVAL 3880 MINUTE)),
(68, 42, 'The feeling of making something work on YOUR computer with YOUR code never fully goes away. Hold onto it.', DATE_SUB(NOW(), INTERVAL 3860 MINUTE)),
(68, 68, 'Thank you all so much. This community is so encouraging. Back to coding!', DATE_SUB(NOW(), INTERVAL 3840 MINUTE)),

(100,41, 'That one-line doc fix is as valid as a 1000-line PR. The intent is the same: make the project better for everyone.', DATE_SUB(NOW(), INTERVAL 5900 MINUTE)),
(100, 2, 'Every major contributor started with a typo fix. Welcome to open source!', DATE_SUB(NOW(), INTERVAL 5880 MINUTE)),
(100,32, 'One commit in is infinitely more than zero commits in. The mindset you bring is exactly right.', DATE_SUB(NOW(), INTERVAL 5860 MINUTE)),
(100,70, 'Go find another issue to fix. That feeling is addictive and you will be a maintainer within a year.', DATE_SUB(NOW(), INTERVAL 5840 MINUTE));

select * from users;
select * from followers;
select * from posts;
SHOW CREATE TABLE followers;
SELECT COUNT(*) AS total_followers FROM followers;
UPDATE users
SET created_at = updated_at
WHERE created_at IS NULL;