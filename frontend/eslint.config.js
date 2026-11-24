export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // 🛡️ LỚP GIÁP CHỐNG LỖI TEMPORAL DEAD ZONE (TDZ):
      // Ngăn chặn 100% mọi biến/state/hook bị truy cập trước khi khởi tạo
      'no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
        },
      ],
    },
  },
];
