import inquirer from "inquirer";
import sqlite3 from "sqlite3";
import chalk from "chalk";
import keypress from "keypress";

// initialize keyboard listener
keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

function addEscListener(callback) {
  const escListener = (ch, key) => {
    if (key && key.name === 'escape') {
      process.stdin.removeListener('keypress', escListener);
      callback(); 
    }
  }
  process.stdin.on('keypress', escListener);
}

// create or open the database
const db = new sqlite3.Database('books.db', (err) => {
  if (err) {
    console.error(err.message);
  }
});

// Create the table if it does not exist
db.run(`
  CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  stars REAL NOT NULL
)`);

// Define the questions to prompt the user
const questions = [
  //name of the user
  {
    type: 'input',
    name: 'name',
    message: 'What book you read?',
    validate: 
      function(value) {
        if (value.length){
          return true;
        } else {
        return 'Please enter a name.';
        }
      },
  },
  //author
  {
    type: 'input',
    name: 'author',
    message: 'Name of the author?',
    validate: 
      function(value) {
        if (value.length){
          return true;
        } else {
        return 'Please enter a name.';
        }
      },
  },
  // stars
  {
    type: 'input',
    name: 'stars',
    message: 'Rate the book (1-5)',
    validate: 
      function(value) {
        const isValid = /^([1-4](\.\d+)?|5(\.0+)?)$/.test(value);
        if (isValid){
          return true;
        } else {
          return 'Please enter a valid number';
        }
      },
  },
]

async function addBook() {
  addEscListener(() => {
    console.log(chalk.red.bold('Returning to the main menu...'));
    promptMainMenu();
  });

  console.log(chalk.blue.bold('Welcome to your private bookapp!'));
  const answers = await inquirer.prompt(questions);
  const name =  answers.name;
  const author = answers.author
  const stars =  parseInt(answers.stars);

  db.run(
    'INSERT INTO books (name, author, stars) VALUES (?,?,?)',
    [name, author, stars],
    function(err) {
      if (err) console.error(err.message);
      console.log(chalk.yellow.bold(`Your book details have been saved with ID ${this.lastID}`));
      promptMainMenu();
    }
  );
}

// Function to view all books
function viewAllBooks() {
  db.all('SELECT * FROM books ORDER BY author', (err, rows) => {
    if (err){
      console.error(err.message);
      return promptMainMenu()
    }

    const formattedRows = rows.map(row => ({
      'ID': row.id,
      'Book Title': row.name,
      'Author Name': row.author,
      'Rating (Stars)': row.stars
    }));

    console.log(chalk.yellow.bold('All books: '));
    console.table(formattedRows)
    promptMainMenu();
  });
}

// Function to update a book
function updateBook() {
  addEscListener(() => {
    console.log(chalk.red.bold('Returning to the main menu...'));
    promptMainMenu();
  });

  inquirer.prompt([
    //Enter ID of book to update
    {
      input: 'input',
      name: 'id',
      message: 'Enter the ID of the book you want to update:',
      validate: function (value) {
        return /^\d+$/.test(value) ? true : 'Please enter a valid ID number'
      },            
    }
  ]).then((idChoice) => {
    const id = parseInt(idChoice.id);
    db.get('SELECT * FROM books WHERE id = ?', [id], (err, book) => {
      if (err) {
        console.error(err.message);
        return promptMainMenu()
      }
      if (!book) {
        console.log(chalk.red.bold(`No book found with ID ${id}`));
        return promptMainMenu()
      }

      inquirer.prompt([
        {
          input: 'input',
          name: 'name',
          message: 'Update the name of the book:',
          default: book.name,
        },
        {
          input: 'input',
          name: 'author',
          message: 'Update the name of author:',
          default: book.author,
        },
        {
          input: 'input',
          name: 'stars',
          message: 'Enter the updated number of stars:',
          validate: function(value) {
            return /^(?:[1-5](?:\.5)?)$/.test(value) ? true : 'Please enter a valid number'
          }
        }
      ]).then((choices) => {
        const name = choices.name;
        const author = choices.author;
        const stars = parseFloat(choices.stars);
        
        // Updating the database
        db.run(
          'UPDATE books SET name = ?, author = ?, stars = ? WHERE id = ?',
          [name, author, stars, id],
          function (err) {
            if (err) console.error (err.message);
            console.log(chalk.yellow.bold (`Book with ID ${id} has been updated. Row affected: ${this.changes}`));
            promptMainMenu();
          }
        );
      }).finally(() => {
        process.stdin.removeListener('keypress', escListener);
      });
    });
  }).catch(() => {
    process.stdin.removeListener('keypress', escListener)
  })
};

function deleteBook() {
  addEscListener(() => {
    console.log(chalk.red.bold('Returning to the main menu...'));
    promptMainMenu();
  });

  inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Enter the ID of the book you want to delete:',
      validate: function (value) {
        return /^\d+$/.test(value) ? true : 'Please enter a valid ID number';
      },  
    }
  ]).then((idChoice) => {
    const id = parseInt(idChoice.id);
    
    // Check if the book exists before attempting to delete
    db.get('SELECT * FROM books WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error(err.message);
        return promptMainMenu();
      }
      if (!row) {
        console.log(chalk.red.bold(`No book found with ID ${id}.`));
        return promptMainMenu();
      }

      // Proceed with deletion if the book exists
      db.run(`DELETE FROM books WHERE id = ?`, [id], function (err) {
        if (err) {
          console.error(err.message);
          return promptMainMenu();
        }
        console.log(chalk.yellow.bold(`Book with ID ${id} has been deleted. Rows affected: ${this.changes}.`));
        promptMainMenu();
      });
    });
  });
}

// Define the main function that prompts the main menu to the user
function promptMainMenu() {
  inquirer.prompt([
    {
    type: 'list',
    name: 'choice',
    message: 'What would you like to do?',
    choices : ['View all books', 'Update book', 'Add a new book', 'Delete a book', 'Exit']
    },
  ])

  .then((choices) => {
    switch (choices.choice) {
      case 'View all books':
        viewAllBooks();
        break;
      case 'Update book':
        updateBook();
        break;
      case 'Add a new book':
        addBook();
        break;
      case 'Delete a book':
        deleteBook();
        break;
      case 'Exit':
        console.log(chalk.bgMagentaBright.bold('Thank you for using our software!'))
        db.close();
        process.exit();
    }
  });
} 

promptMainMenu()