// Exercise list + muscle mapping
// Muscle group ids used by the SVG body map:
// chest, frontDelts, sideDelts, rearDelts, traps, biceps, triceps, forearms,
// abs, obliques, lats, midBack, lowerBack, glutes, quads, hamstrings, adductors, calves

export type MuscleId =
  | "chest" | "frontDelts" | "sideDelts" | "rearDelts" | "traps"
  | "biceps" | "triceps" | "forearms"
  | "abs" | "obliques"
  | "lats" | "midBack" | "lowerBack"
  | "glutes" | "quads" | "hamstrings" | "adductors" | "calves";

export const EXERCISES: string[] = [
  "Bench Press","Incline Bench Press","Decline Bench Press","Dumbbell Bench Press","Incline Dumbbell Press",
  "Chest Fly","Pec Deck Fly","Cable Fly","Push-Up Machine Press","Smith Machine Bench Press",
  "Guillotine Press","Svend Press","Hex Press","Dumbbell Pullover",
  "Overhead Press","Military Press","Arnold Press","Dumbbell Shoulder Press","Lateral Raise",
  "Front Raise","Rear Delt Fly","Upright Row","Face Pull","Cable Lateral Raise","Cuban Press",
  "Bradford Press","Machine Shoulder Press",
  "Deadlift","Barbell Row","Dumbbell Row","T-Bar Row","Seated Cable Row","Lat Pulldown",
  "Pull-Over Machine","Rack Pull","Meadows Row","Pendlay Row","Chest Supported Row",
  "Straight Arm Pulldown","Machine Row","Shrug",
  "Barbell Curl","Dumbbell Curl","Hammer Curl","Preacher Curl","Concentration Curl","Cable Curl",
  "Spider Curl","EZ Bar Curl","Bayesian Curl","Reverse Curl","Zottman Curl",
  "Tricep Pushdown","Skull Crusher","Overhead Tricep Extension","Close Grip Bench Press",
  "Dumbbell Kickback","Rope Pushdown","JM Press","Dip Machine","Cable Extension",
  "Squat","Front Squat","Back Squat","Goblet Squat","Bulgarian Split Squat","Leg Press",
  "Leg Extension","Romanian Deadlift","Stiff Leg Deadlift","Hack Squat","Walking Lunge",
  "Reverse Lunge","Step Up","Hip Thrust","Glute Bridge","Hamstring Curl","Standing Calf Raise",
  "Seated Calf Raise","Sissy Squat","Jefferson Squat",
  "Crunch","Cable Crunch","Russian Twist","Hanging Leg Raise","Ab Wheel Rollout","Plank",
  "Side Plank","Mountain Climber","Reverse Crunch","Bicycle Crunch","Dragon Flag","Toe Touch",
  "Push-Up","Knee Push-Up","Incline Push-Up","Australian Pull-Up","Bodyweight Squat","Wall Sit",
  "Hollow Hold","Dead Hang","Pike Push-Up","Bench Dip",
  "Pull-Up","Chin-Up","Diamond Push-Up","Archer Push-Up","Dips","Jump Squat","Pistol Squat",
  "Hanging Knee Raise","L-Sit","Tuck Front Lever","Tuck Planche","Explosive Push-Up",
  "Clap Push-Up","Archer Pull-Up",
  "Muscle-Up","Front Lever","Back Lever","Human Flag","Planche","Handstand Push-Up",
  "One Arm Push-Up","One Arm Pull-Up","Victorian Hold","Iron Cross","Hefesto","Maltese",
  "Full Planche Push-Up","Front Lever Pull-Up",
];

// Map exercise -> primary muscle groups using keyword matching.
export function exerciseMuscles(name: string): MuscleId[] {
  const n = name.toLowerCase();
  const out = new Set<MuscleId>();
  const add = (...m: MuscleId[]) => m.forEach(x => out.add(x));

  // Chest pressing/flyes/pushups
  if (/(bench press|push.?up|dip|fly|pec deck|svend|hex press|guillotine|jm press|planche|maltese|victorian)/.test(n)) {
    add("chest","frontDelts","triceps");
  }
  if (/incline/.test(n)) add("chest","frontDelts");
  if (/pullover/.test(n)) add("chest","lats");

  // Shoulders
  if (/(overhead press|military|arnold|shoulder press|pike push|handstand|bradford|cuban)/.test(n))
    add("frontDelts","sideDelts","triceps","traps");
  if (/lateral raise/.test(n)) add("sideDelts");
  if (/front raise/.test(n)) add("frontDelts");
  if (/(rear delt|face pull|reverse fly)/.test(n)) add("rearDelts","midBack");
  if (/upright row/.test(n)) add("sideDelts","traps","biceps");
  if (/shrug/.test(n)) add("traps");

  // Back / pulls
  if (/(pull-?up|chin-?up|lat pulldown|pulldown|muscle-?up|archer pull|one arm pull|front lever)/.test(n))
    add("lats","biceps","midBack","rearDelts");
  if (/(row|meadows|pendlay|t-bar)/.test(n)) add("midBack","lats","biceps","rearDelts");
  if (/(deadlift|rack pull)/.test(n)) add("lowerBack","glutes","hamstrings","traps","forearms");
  if (/back lever|iron cross|hefesto/.test(n)) add("lats","midBack","biceps","rearDelts");
  if (/human flag/.test(n)) add("obliques","lats","sideDelts");

  // Biceps
  if (/(curl)/.test(n)) add("biceps","forearms");
  if (/hammer|zottman|reverse curl/.test(n)) add("forearms","biceps");

  // Triceps
  if (/(tricep|skull|pushdown|extension|close grip|kickback|jm press)/.test(n))
    add("triceps");

  // Legs
  if (/(squat|lunge|step up|leg press|hack squat|sissy|jefferson|wall sit|pistol)/.test(n))
    add("quads","glutes","adductors");
  if (/front squat|goblet/.test(n)) add("quads","abs");
  if (/leg extension/.test(n)) add("quads");
  if (/(romanian|stiff leg|hamstring curl)/.test(n)) add("hamstrings","glutes","lowerBack");
  if (/(hip thrust|glute bridge)/.test(n)) add("glutes","hamstrings");
  if (/calf raise/.test(n)) add("calves");
  if (/jump squat/.test(n)) add("quads","glutes","calves");

  // Core
  if (/(crunch|plank|ab wheel|leg raise|russian twist|mountain climber|bicycle|dragon flag|toe touch|hollow|l-?sit|tuck front lever|tuck planche|knee raise)/.test(n))
    add("abs","obliques");
  if (/side plank|russian twist|oblique/.test(n)) add("obliques");

  // Misc bodyweight
  if (/dead hang/.test(n)) add("forearms","lats");
  if (/australian pull/.test(n)) add("midBack","biceps","rearDelts");
  if (/bodyweight squat/.test(n)) add("quads","glutes");

  if (out.size === 0) add("chest"); // fallback
  return Array.from(out);
}

// Categorize by primary section for the picker
export function exerciseCategory(name: string): string {
  const n = name.toLowerCase();
  if (/(bench|fly|pec|push.?up|svend|hex|guillotine|pullover|dip)/.test(n)) return "Chest";
  if (/(overhead|military|arnold|shoulder|lateral|front raise|rear delt|face pull|upright|cuban|bradford|shrug|pike push|handstand)/.test(n)) return "Shoulders";
  if (/(deadlift|row|pulldown|pull-?up|chin-?up|muscle-?up|lever|rack pull|straight arm|archer pull|one arm pull|hefesto|iron cross|back lever)/.test(n)) return "Back";
  if (/curl/.test(n)) return "Biceps";
  if (/(tricep|skull|pushdown|extension|close grip|kickback|jm press)/.test(n)) return "Triceps";
  if (/(squat|lunge|leg press|leg extension|hamstring|romanian|stiff leg|hip thrust|glute|calf|step up|hack|sissy|jefferson|pistol|wall sit|jump squat)/.test(n)) return "Legs";
  if (/(crunch|plank|ab wheel|leg raise|russian twist|mountain climber|bicycle|dragon flag|toe touch|hollow|l-?sit|knee raise|side plank|oblique)/.test(n)) return "Core";
  return "Other";
}
