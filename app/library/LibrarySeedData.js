// app/library/LibrarySeedData.js
// Year 1 / 2026 Academic Study Seed Data for Computer Science.

const LibrarySeedData = {
  year: "Year 1 / 2026",
  semesters: [
    {
      id: 1,
      name: "Semester 1",
      modules: [
        {
          id: "intro-to-programming",
          name: "Introduction to Programming",
          topics: [
            "Finals",
            "Mid Term"
          ]
        },
        {
          id: "computational-mathematics",
          name: "Computational Mathematics",
          topics: [
            "Number Bases",
            "Sequences and Series",
            "Modular Arithmetic",
            "Angles and Trigonometry",
            "Graph Sketching and Kinematics",
            "Trigonometric Functions",
            "Exponential and Logarithmic Functions",
            "Limits and Differentiation",
            "Algebra, Vector and Matrices",
            "Combinatorics and Probability",
            "Mid Terms",
            "Finals"
          ]
        },
        {
          id: "discrete-mathematics",
          name: "Discrete Mathematics",
          topics: [
            "Sets",
            "Functions",
            "Propositional Logic",
            "Predicate Logic",
            "Boolean Algebra",
            "Mathematical Induction",
            "Graphs",
            "Trees",
            "Relations",
            "Combinatorics",
            "Mid Terms",
            "Finals"
          ]
        },
        {
          id: "algorithms-and-data-structures",
          name: "Algorithms and Data Structures",
          topics: [
            "Problems, Algorithms and Flowcharts",
            "Pseudocode",
            "Vectors, Stacks and Queues",
            "Data Structures and Searching",
            "Sorting Data 1",
            "What Makes a Good Algorithm",
            "Searching Data 2",
            "Recursion",
            "Sorting Data 2",
            "Computational Complexity",
            "Mid Terms",
            "Finals"
          ]
        }
      ]
    },
    {
      id: 2,
      name: "Semester 2",
      modules: [
        {
          id: "web-development",
          name: "Web Development",
          topics: [
            "HTTP and HTML",
            "Foundational Algorithms Parsing Markup Languages",
            "Layout for Different Devices",
            "Accessibility and Usability Standards",
            "Working with Data Sources and Data Security",
            "Template Engines and Other Presentation Techniques",
            "Website Lifecycle",
            "Methods for Team Collaboration and Project Management",
            "Ethical, Legal and Sustainability Issues",
            "Generative AI and Web Development"
          ]
        },
        {
          id: "how-computers-work",
          name: "How Computers Work",
          topics: [
            "How a Computer Works",
            "How the Web Works",
            "Data Representation",
            "Computer Architecture",
            "Operating Systems",
            "Operating System Processes",
            "Networks",
            "The Internet",
            "Machine Learning",
            "Data Science"
          ]
        },
        {
          id: "introduction-to-programming-ii",
          name: "Introduction to Programming II",
          topics: [
            "Object Orientation in Practice",
            "Introducing Case Study 1 — Drawing App",
            "Introducing Case Study 2 — Music Visualiser",
            "Introducing Case Study 3 — Data Visualisation",
            "Extending the Apps Part 1",
            "Extending the Apps Part 2",
            "Extending the Apps Part 3",
            "Callbacks",
            "Testing for Stability",
            "Testing with Users"
          ]
        },
        {
          id: "fundamentals-of-computer-science",
          name: "Fundamentals of Computer Science",
          topics: [
            "Logic",
            "Proof Techniques",
            "Basic Combinatorial Principles",
            "Automata Theory",
            "Regular Languages",
            "Context-Free Languages",
            "Turing Machines",
            "Algorithms I",
            "Algorithms II",
            "Complexity Theory"
          ]
        }
      ]
    }
  ],

  // Classification logic helper
  // - Finals = exam
  // - Mid Term / Mid Terms = assessment
  // - Any "Case Study" item = project
  // - Everything else = lecture
  classifyTopic(topicName) {
    const name = topicName.toLowerCase().trim();
    if (name.includes("finals")) {
      return "exam";
    }
    if (name === "mid term" || name === "mid terms") {
      return "assessment";
    }
    if (name.includes("case study")) {
      return "project";
    }
    return "lecture";
  },

  // Helper to get formatted details for a module
  getModuleStats(module) {
    let lectures = 0;
    let assessments = 0;
    let exams = 0;
    let projects = 0;

    module.topics.forEach(t => {
      const type = this.classifyTopic(t);
      if (type === "lecture") lectures++;
      else if (type === "assessment") assessments++;
      else if (type === "exam") exams++;
      else if (type === "project") projects++;
    });

    return { lectures, assessments, exams, projects };
  }
};
