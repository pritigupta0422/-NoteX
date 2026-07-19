const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: Supabase URL or Key is missing from environmental variables!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const db = {
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

module.exports = db;
