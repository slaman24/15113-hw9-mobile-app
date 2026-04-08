I created a Birthday Tracker app that people can use to organize their family and friends' birthdays. Through the app, people can add birthdays and see a chronological list of all of the birthdays they have saved (in order by how many days away they are). I feel that this app could be a helpful tool and it is something I would definitely love to have for myself so I never forget a birthday.

There are 3 screens in total:

Home Screen - This is where the user can see the chronological list of all the birthdays they have saved in the system (each birthday is a card with the person's name, birthday, number of days away, and optional notes)

Add Screen - This is where the user can add a new birthday with a form. In order to successfully add a birthday, they must enter a name and date of birth (they also have the option to enter additional notes, possibly for gift ideas or party plans)

Edit Screen - This is where the user can edit an existing birthday in the system (accessed by clicking on birthday card on the Home screen vs. the main navigation bar)

The app can be run by cloning the repo, running npm install, and then npx expo start.

One thing I learned about mobile development that surprised me was the parallels I was able to identify between this assignment and previous ones, particularly hw6 where we got to work with databases. While this process was much more complex to implement, I could see the CRUD operations at work here. The user is able to create/read/update/delete birthdays in the app.

Video Demo:

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
