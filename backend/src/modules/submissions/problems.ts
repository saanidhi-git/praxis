
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Problem {
  slug: string;
  title: string;
  prompt: string;
  difficulty: Difficulty;
  topic: string;
  starter: string;
  visibleTests: string[];
  hiddenTests: string[];
  generated?: boolean;
}

const P = (
  slug: string, title: string, difficulty: Difficulty, topic: string,
  prompt: string, starter: string, visibleTests: string[], hiddenTests: string[],
): Problem => ({ slug, title, difficulty, topic, prompt, starter, visibleTests, hiddenTests });

export const PROBLEMS: Problem[] = [
  // ---------------- easy ----------------
  P('two_sum', 'Two Sum', 'easy', 'Arrays',
    'Return the indices of the two numbers that add up to target.',
    'def solve(nums, target):\n    # your code here\n    return []\n',
    ['assert solve([2,7,11,15], 9) == [0,1]', 'assert solve([3,2,4], 6) == [1,2]'],
    ['assert solve([3,3], 6) == [0,1]', 'assert solve([], 0) == []',
     'assert solve([-3,4,3,90], 0) == [0,2]']),

  P('reverse_string', 'Reverse a String', 'easy', 'Strings',
    'Return the string reversed.',
    'def solve(s):\n    # your code here\n    return ""\n',
    ["assert solve('abc') == 'cba'", "assert solve('hello') == 'olleh'"],
    ["assert solve('') == ''", "assert solve('a') == 'a'", "assert solve('ab ') == ' ba'"]),

  P('count_vowels', 'Count Vowels', 'easy', 'Strings',
    'Count how many vowels appear in the string, ignoring case.',
    'def solve(s):\n    # your code here\n    return 0\n',
    ["assert solve('hello') == 2", "assert solve('xyz') == 0"],
    ["assert solve('') == 0", "assert solve('AEIOU') == 5", "assert solve('Hello World') == 3"]),

  P('fizzbuzz', 'FizzBuzz', 'easy', 'Logic',
    'Return the FizzBuzz list from 1 to n, as strings.',
    'def solve(n):\n    # your code here\n    return []\n',
    ["assert solve(3) == ['1','2','Fizz']", "assert solve(5)[-1] == 'Buzz'"],
    ['assert solve(0) == []', "assert solve(15)[-1] == 'FizzBuzz'", 'assert len(solve(100)) == 100']),

  P('factorial', 'Factorial', 'easy', 'Math',
    'Return n factorial.',
    'def solve(n):\n    # your code here\n    return 1\n',
    ['assert solve(5) == 120', 'assert solve(3) == 6'],
    ['assert solve(0) == 1', 'assert solve(1) == 1', 'assert solve(10) == 3628800']),

  P('is_palindrome', 'Palindrome Check', 'easy', 'Strings',
    'Return True if the text reads the same forwards and backwards, ignoring case and punctuation.',
    'def solve(s):\n    # your code here\n    return False\n',
    ["assert solve('racecar') is True", "assert solve('hello') is False"],
    ["assert solve('') is True", "assert solve('A man, a plan, a canal: Panama') is True",
     "assert solve('ab') is False"]),

  P('sum_list', 'Sum a List', 'easy', 'Arrays',
    'Return the sum of all numbers in the list.',
    'def solve(nums):\n    # your code here\n    return 0\n',
    ['assert solve([1,2,3]) == 6', 'assert solve([10]) == 10'],
    ['assert solve([]) == 0', 'assert solve([-1,1]) == 0', 'assert solve([-5,-5]) == -10']),

  P('largest_number', 'Largest Number', 'easy', 'Arrays',
    'Return the largest number in the list, or None when the list is empty.',
    'def solve(nums):\n    # your code here\n    return None\n',
    ['assert solve([1,9,3]) == 9', 'assert solve([5]) == 5'],
    ['assert solve([]) is None', 'assert solve([-3,-1,-7]) == -1', 'assert solve([2,2]) == 2']),

  P('word_count', 'Word Count', 'easy', 'Dictionaries',
    'Return a dictionary mapping each word to how many times it appears.',
    'def solve(text):\n    # your code here\n    return {}\n',
    ["assert solve('a b a') == {'a':2,'b':1}", "assert solve('x') == {'x':1}"],
    ["assert solve('') == {}", "assert solve('   ') == {}", "assert solve('A a') == {'A':1,'a':1}"]),

  P('celsius_to_f', 'Celsius to Fahrenheit', 'easy', 'Math',
    'Convert a temperature from Celsius to Fahrenheit.',
    'def solve(c):\n    # your code here\n    return 0\n',
    ['assert solve(0) == 32', 'assert solve(100) == 212'],
    ['assert solve(-40) == -40', 'assert abs(solve(37) - 98.6) < 1e-9']),

  // ---------------- medium ----------------
  P('max_subarray', 'Maximum Subarray', 'medium', 'Arrays',
    'Return the largest sum obtainable from any contiguous run of numbers.',
    'def solve(nums):\n    # your code here\n    return 0\n',
    ['assert solve([-2,1,-3,4,-1,2,1,-5,4]) == 6', 'assert solve([1,2,3]) == 6'],
    ['assert solve([]) == 0', 'assert solve([-1]) == -1', 'assert solve([-5,-2,-9]) == -2']),

  P('binary_search', 'Binary Search', 'medium', 'Searching',
    'Return the index of target in the sorted list, or -1 if it is not present.',
    'def solve(arr, target):\n    # your code here\n    return -1\n',
    ['assert solve([1,2,3,4,5], 3) == 2', 'assert solve([1,2,3], 9) == -1'],
    ['assert solve([], 1) == -1', 'assert solve([5], 5) == 0',
     'assert solve(list(range(1000)), 999) == 999']),

  P('remove_duplicates', 'Remove Duplicates', 'medium', 'Arrays',
    'Remove duplicates, keeping the first occurrence of each item in order.',
    'def solve(items):\n    # your code here\n    return []\n',
    ['assert solve([1,2,2,3]) == [1,2,3]', 'assert solve([1,1,1]) == [1]'],
    ['assert solve([]) == []', 'assert solve([3,1,3,1]) == [3,1]',
     "assert solve(['a','b','a']) == ['a','b']"]),

  P('merge_sorted', 'Merge Two Sorted Lists', 'medium', 'Arrays',
    'Merge two already-sorted lists into a single sorted list.',
    'def solve(a, b):\n    # your code here\n    return []\n',
    ['assert solve([1,3],[2,4]) == [1,2,3,4]', 'assert solve([1],[2]) == [1,2]'],
    ['assert solve([],[]) == []', 'assert solve([],[1,2]) == [1,2]',
     'assert solve([1,1],[1]) == [1,1,1]']),

  P('fibonacci', 'Fibonacci', 'medium', 'Recursion',
    'Return the nth Fibonacci number, counting from 0 at index 0.',
    'def solve(n):\n    # your code here\n    return 0\n',
    ['assert solve(5) == 5', 'assert solve(7) == 13'],
    ['assert solve(0) == 0', 'assert solve(1) == 1', 'assert solve(30) == 832040']),

  P('anagram_check', 'Anagram Check', 'medium', 'Strings',
    'Return True if both strings use exactly the same letters.',
    'def solve(a, b):\n    # your code here\n    return False\n',
    ["assert solve('listen','silent') is True", "assert solve('abc','abd') is False"],
    ["assert solve('','') is True", "assert solve('a','aa') is False",
     "assert solve('aab','aba') is True"]),

  P('first_unique', 'First Unique Character', 'medium', 'Strings',
    'Return the first character appearing exactly once, or an empty string if there is none.',
    'def solve(s):\n    # your code here\n    return ""\n',
    ["assert solve('leetcode') == 'l'", "assert solve('aabb') == ''"],
    ["assert solve('') == ''", "assert solve('a') == 'a'", "assert solve('aabbc') == 'c'"]),

  P('rotate_list', 'Rotate a List', 'medium', 'Arrays',
    'Rotate the list to the right by k positions.',
    'def solve(nums, k):\n    # your code here\n    return []\n',
    ['assert solve([1,2,3,4,5], 2) == [4,5,1,2,3]', 'assert solve([1,2], 1) == [2,1]'],
    ['assert solve([], 3) == []', 'assert solve([1,2,3], 0) == [1,2,3]',
     'assert solve([1,2,3], 5) == [2,3,1]']),

  P('group_by_length', 'Group Words by Length', 'medium', 'Dictionaries',
    'Group the words into a dictionary keyed by word length.',
    'def solve(words):\n    # your code here\n    return {}\n',
    ["assert solve(['a','bb','cc']) == {1:['a'],2:['bb','cc']}",
     "assert solve(['x']) == {1:['x']}"],
    ['assert solve([]) == {}', "assert solve(['','a']) == {0:[''],1:['a']}"]),

  // ---------------- hard ----------------
  P('longest_substring', 'Longest Substring Without Repeats', 'hard', 'Strings',
    'Return the length of the longest substring containing no repeated character.',
    'def solve(s):\n    # your code here\n    return 0\n',
    ["assert solve('abcabcbb') == 3", "assert solve('bbbbb') == 1"],
    ["assert solve('') == 0", "assert solve('pwwkew') == 3", "assert solve('abcdef') == 6"]),

  P('valid_parentheses', 'Valid Parentheses', 'hard', 'Stacks',
    'Return True if every bracket is opened and closed correctly and in order.',
    'def solve(s):\n    # your code here\n    return False\n',
    ["assert solve('()') is True", "assert solve('(]') is False"],
    ["assert solve('') is True", "assert solve('([{}])') is True", "assert solve('(') is False"]),

  P('two_sum_sorted', 'Two Sum on a Sorted List', 'hard', 'Two Pointers',
    'The list is sorted. Return the 1-based indices of the two numbers adding to target.',
    'def solve(nums, target):\n    # your code here\n    return []\n',
    ['assert solve([2,7,11,15], 9) == [1,2]', 'assert solve([1,2,3], 5) == [2,3]'],
    ['assert solve([], 5) == []', 'assert solve([1,2], 3) == [1,2]',
     'assert solve([-3,0,3], 0) == [1,3]']),

  P('climb_stairs', 'Climbing Stairs', 'hard', 'Dynamic Programming',
    'You may climb 1 or 2 steps at a time. How many distinct ways reach step n?',
    'def solve(n):\n    # your code here\n    return 0\n',
    ['assert solve(2) == 2', 'assert solve(3) == 3'],
    ['assert solve(0) == 1', 'assert solve(1) == 1', 'assert solve(10) == 89']),

  P('flatten_nested', 'Flatten a Nested List', 'hard', 'Recursion',
    'Flatten a list that may contain further lists, to any depth.',
    'def solve(items):\n    # your code here\n    return []\n',
    ['assert solve([1,[2,3]]) == [1,2,3]', 'assert solve([[1],[2]]) == [1,2]'],
    ['assert solve([]) == []', 'assert solve([1,[2,[3,[4]]]]) == [1,2,3,4]',
     'assert solve([[],[]]) == []']),
];

const generated = new Map<string, Problem>();

export function allProblems(): Problem[] {
  return [...PROBLEMS, ...generated.values()];
}

export function problemBySlug(slug: string): Problem | undefined {
  return PROBLEMS.find((p) => p.slug === slug) ?? generated.get(slug);
}

export function registerGenerated(p: Problem): void {
  generated.set(p.slug, p);
  if (generated.size > 200) {
    const oldest = generated.keys().next().value;
    if (oldest) generated.delete(oldest);
  }
}

export const TOPICS: string[] = [...new Set(PROBLEMS.map((p) => p.topic))].sort();
