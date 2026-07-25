const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const useLocalDb = !supabaseUrl || !supabaseKey;

let db;

if (useLocalDb) {
  console.log("Supabase credentials missing. Falling back to local file storage / database.");

  const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
  const FILES_FILE = path.join(__dirname, '..', 'data', 'files.json');
  const mockStorageDir = path.join(__dirname, '..', 'uploads_storage');

  // Ensure data folder and files exist
  const DATA_DIR = path.dirname(USERS_FILE);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(FILES_FILE)) {
    fs.writeFileSync(FILES_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(mockStorageDir)) {
    fs.mkdirSync(mockStorageDir, { recursive: true });
  }

  function readJSON(file) {
    try {
      if (!fs.existsSync(file)) return [];
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`Error reading file ${file}:`, e);
      return [];
    }
  }

  function writeJSON(file, data) {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error(`Error writing file ${file}:`, e);
    }
  }

  const mockSupabase = {
    storage: {
      from: (bucketName) => ({
        async upload(filename, buffer, options) {
          try {
            const filePath = path.join(mockStorageDir, filename);
            fs.writeFileSync(filePath, buffer);
            return { data: { path: filename }, error: null };
          } catch (err) {
            console.error('Mock Storage Upload Error:', err);
            return { data: null, error: err };
          }
        },
        async download(filename) {
          try {
            const filePath = path.join(mockStorageDir, filename);
            if (!fs.existsSync(filePath)) {
              return { data: null, error: new Error('File not found in mock storage') };
            }
            const buffer = fs.readFileSync(filePath);
            const fileData = {
              async arrayBuffer() {
                return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
              }
            };
            return { data: fileData, error: null };
          } catch (err) {
            console.error('Mock Storage Download Error:', err);
            return { data: null, error: err };
          }
        },
        async remove(filenames) {
          try {
            for (const filename of filenames) {
              const filePath = path.join(mockStorageDir, filename);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            }
            return { data: filenames, error: null };
          } catch (err) {
            console.error('Mock Storage Delete Error:', err);
            return { data: null, error: err };
          }
        }
      })
    }
  };

  db = {
    // Expose the raw client for Storage bucket uploads/deletes
    client: mockSupabase,

    // Users Operations (Database queries)
    async findUserByEmail(email) {
      try {
        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        return user || null;
      } catch (err) {
        console.error('Local findUserByEmail error:', err);
        return null;
      }
    },

    async findUserById(id) {
      try {
        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.id === id);
        return user || null;
      } catch (err) {
        console.error('Local findUserById error:', err);
        return null;
      }
    },

    async createUser(user) {
      try {
        const users = readJSON(USERS_FILE);
        users.push(user);
        writeJSON(USERS_FILE, users);
        return user;
      } catch (err) {
        console.error('Local createUser error:', err);
        throw err;
      }
    },

    // Files Operations
    async getFiles() {
      try {
        return readJSON(FILES_FILE);
      } catch (err) {
        console.error('Local getFiles error:', err);
        return [];
      }
    },

    async findFileById(id) {
      try {
        const files = readJSON(FILES_FILE);
        const file = files.find(f => f.id === id);
        return file || null;
      } catch (err) {
        console.error('Local findFileById error:', err);
        return null;
      }
    },

    async createFile(file) {
      try {
        const files = readJSON(FILES_FILE);
        files.push(file);
        writeJSON(FILES_FILE, files);
        return file;
      } catch (err) {
        console.error('Local createFile error:', err);
        throw err;
      }
    },

    async deleteFile(id) {
      try {
        let files = readJSON(FILES_FILE);
        const initialLength = files.length;
        files = files.filter(f => f.id !== id);
        writeJSON(FILES_FILE, files);
        return files.length < initialLength;
      } catch (err) {
        console.error('Local deleteFile error:', err);
        return false;
      }
    },

    async incrementDownloads(id) {
      try {
        const files = readJSON(FILES_FILE);
        const fileIndex = files.findIndex(f => f.id === id);
        if (fileIndex !== -1) {
          files[fileIndex].downloadsCount = (files[fileIndex].downloadsCount || 0) + 1;
          writeJSON(FILES_FILE, files);
          return files[fileIndex];
        }
        return null;
      } catch (err) {
        console.error('Local incrementDownloads error:', err);
        return null;
      }
    },

    async incrementViews(id) {
      try {
        const files = readJSON(FILES_FILE);
        const fileIndex = files.findIndex(f => f.id === id);
        if (fileIndex !== -1) {
          files[fileIndex].viewsCount = (files[fileIndex].viewsCount || 0) + 1;
          writeJSON(FILES_FILE, files);
          return files[fileIndex];
        }
        return null;
      } catch (err) {
        console.error('Local incrementViews error:', err);
        return null;
      }
    },

    async updateFileShares(id, sharedWith) {
      try {
        const files = readJSON(FILES_FILE);
        const fileIndex = files.findIndex(f => f.id === id);
        if (fileIndex !== -1) {
          files[fileIndex].sharedWith = sharedWith;
          writeJSON(FILES_FILE, files);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Local updateFileShares error:', err);
        return false;
      }
    },

    async updateUserWhitelist(id, whitelist) {
      try {
        const users = readJSON(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
          users[userIndex].whitelist = whitelist;
          writeJSON(USERS_FILE, users);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Local updateUserWhitelist error:', err);
        return false;
      }
    },

    async updateFileVisibility(id, isPersonal) {
      try {
        const files = readJSON(FILES_FILE);
        const fileIndex = files.findIndex(f => f.id === id);
        if (fileIndex !== -1) {
          files[fileIndex].isPersonal = isPersonal;
          writeJSON(FILES_FILE, files);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Local updateFileVisibility error:', err);
        return false;
      }
    },

    async getUsersWhitelistMap() {
      try {
        const users = readJSON(USERS_FILE);
        const map = {};
        users.forEach(u => {
          map[u.id] = u.whitelist || '';
        });
        return map;
      } catch (err) {
        console.error('Local getUsersWhitelistMap error:', err);
        return {};
      }
    }
  };

} else {
  console.log("Supabase URL and Key found. Connecting to Supabase database...");
  const supabase = createClient(supabaseUrl, supabaseKey);

  db = {
    // Expose the raw client for Storage bucket uploads/deletes
    client: supabase,

    // Users Operations (Database queries)
    async findUserByEmail(email) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        
        if (error) throw error;
        
        // Map columns if needed (Supabase database uses snake_case column names, but our JS model uses camelCase!)
        if (data) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            passwordHash: data.password_hash,
            branch: data.branch,
            semester: data.semester,
            role: data.role,
            createdAt: data.created_at,
            whitelist: data.whitelist
          };
        }
        return null;
      } catch (err) {
        console.error('Supabase findUserByEmail error:', err);
        return null;
      }
    },

    async findUserById(id) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            passwordHash: data.password_hash,
            branch: data.branch,
            semester: data.semester,
            role: data.role,
            createdAt: data.created_at,
            whitelist: data.whitelist
          };
        }
        return null;
      } catch (err) {
        console.error('Supabase findUserById error:', err);
        return null;
      }
    },

    async createUser(user) {
      try {
        // Map JS camelCase object to PostgreSQL snake_case database schema
        const dbUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          password_hash: user.passwordHash,
          branch: user.branch,
          semester: user.semester,
          role: user.role,
          created_at: user.createdAt,
          whitelist: user.whitelist || ''
        };

        const result = await supabase
          .from('users')
          .insert([dbUser])
          .select()
          .single();

        if (result.error) {
          // Fallback retry if whitelist column is missing from database schema
          if (result.error.code === 'PGRST204' || (result.error.message && result.error.message.includes('whitelist'))) {
            console.warn('Supabase whitelist column missing. Retrying signup without whitelist field.');
            delete dbUser.whitelist;
            const retryResult = await supabase
              .from('users')
              .insert([dbUser])
              .select()
              .single();
            if (retryResult.error) throw retryResult.error;
            return user;
          }
          throw result.error;
        }
        return user;
      } catch (err) {
        console.error('Supabase createUser error:', err);
        throw err;
      }
    },

    // Files Operations
    async getFiles() {
      try {
        const { data, error } = await supabase
          .from('files')
          .select('*');

        if (error) throw error;

        // Map snake_case columns back to camelCase properties for frontend/controller compatibility
        return (data || []).map(f => ({
          id: f.id,
          title: f.title,
          subject: f.subject,
          category: f.category,
          unitTopic: f.unit_topic,
          year: f.year,
          originalName: f.original_name,
          fileName: f.file_name,
          fileSize: parseInt(f.file_size, 10),
          uploaderId: f.uploader_id,
          uploaderName: f.uploader_name,
          uploadedAt: f.uploaded_at,
          downloadsCount: f.downloads_count,
          viewsCount: f.views_count,
          isPersonal: f.is_personal,
          sharedWith: f.shared_with
        }));
      } catch (err) {
        console.error('Supabase getFiles error:', err);
        return [];
      }
    },

    async findFileById(id) {
      try {
        const { data, error } = await supabase
          .from('files')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          return {
            id: data.id,
            title: data.title,
            subject: data.subject,
            category: data.category,
            unitTopic: data.unit_topic,
            year: data.year,
            originalName: data.original_name,
            fileName: data.file_name,
            fileSize: parseInt(data.file_size, 10),
            uploaderId: data.uploader_id,
            uploaderName: data.uploader_name,
            uploadedAt: data.uploaded_at,
            downloadsCount: data.downloads_count,
            viewsCount: data.views_count,
            isPersonal: data.is_personal,
            sharedWith: data.shared_with
          };
        }
        return null;
      } catch (err) {
        console.error('Supabase findFileById error:', err);
        return null;
      }
    },

    async createFile(file) {
      try {
        const dbFile = {
          id: file.id,
          title: file.title,
          subject: file.subject,
          category: file.category,
          unit_topic: file.unitTopic,
          year: file.year,
          original_name: file.originalName,
          file_name: file.fileName,
          file_size: file.fileSize,
          uploader_id: file.uploaderId,
          uploader_name: file.uploaderName,
          uploaded_at: file.uploadedAt,
          downloads_count: file.downloadsCount,
          views_count: file.viewsCount,
          is_personal: file.isPersonal || false,
          shared_with: file.sharedWith || ''
        };

        const { error } = await supabase
          .from('files')
          .insert([dbFile]);

        if (error) throw error;
        return file;
      } catch (err) {
        console.error('Supabase createFile error:', err);
        throw err;
      }
    },

    async deleteFile(id) {
      try {
        const { error } = await supabase
          .from('files')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase deleteFile error:', err);
        return false;
      }
    },

    async incrementDownloads(id) {
      try {
        const file = await this.findFileById(id);
        if (!file) return null;

        const { data, error } = await supabase
          .from('files')
          .update({ downloads_count: (file.downloadsCount || 0) + 1 })
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase incrementDownloads error:', err);
        return null;
      }
    },

    async incrementViews(id) {
      try {
        const file = await this.findFileById(id);
        if (!file) return null;

        const { data, error } = await supabase
          .from('files')
          .update({ views_count: (file.viewsCount || 0) + 1 })
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase incrementViews error:', err);
        return null;
      }
    },

    async updateFileShares(id, sharedWith) {
      try {
        const { error } = await supabase
          .from('files')
          .update({ shared_with: sharedWith })
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase updateFileShares error:', err);
        return false;
      }
    },

    async updateUserWhitelist(id, whitelist) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ whitelist })
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase updateUserWhitelist error:', err);
        return false;
      }
    },

    async updateFileVisibility(id, isPersonal) {
      try {
        const { error } = await supabase
          .from('files')
          .update({ is_personal: isPersonal })
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase updateFileVisibility error:', err);
        return false;
      }
    },

    async getUsersWhitelistMap() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, whitelist');

        if (error) throw error;

        const map = {};
        (data || []).forEach(u => {
          map[u.id] = u.whitelist || '';
        });
        return map;
      } catch (err) {
        console.error('Supabase getUsersWhitelistMap error:', err);
        return {};
      }
    }
  };
}

module.exports = db;
